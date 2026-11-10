import { randomInt } from "node:crypto";
import { getAuth, getViewer } from "@/lib/server/auth";
import { adminEmail, authEnabled, isAdminEmail } from "@/lib/server/auth-env";
import { db } from "@/lib/server/db";
import type { AdminUser, UserStatus } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** 관리자(빌드 때 ADMIN_EMAIL·ADMIN_PASSWORD로 만든 계정)만 통과해요. */
async function requireAdmin(req: Request): Promise<Response | null> {
  if (!authEnabled()) return Response.json({ error: "로그인이 꺼져 있어요." }, { status: 404 });
  const viewer = await getViewer(req.headers);
  if (!viewer) return Response.json({ error: "로그인이 필요해요." }, { status: 401 });
  if (!viewer.isAdmin) return Response.json({ error: "관리자만 볼 수 있어요." }, { status: 403 });
  return null;
}

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const pool = db();
  if (new URL(req.url).searchParams.get("summary") === "1") {
    // 관리자 계정은 DB 상태와 상관없이 승인된 것으로 보니 세지 않아요.
    const { rows } = await pool.query<{ n: string }>(
      `select count(*) as n from "user" where status = 'pending' and not ("emailVerified" and lower(email) = coalesce($1, ''))`,
      [adminEmail()],
    );
    return Response.json({ pending: Number(rows[0]?.n ?? 0) });
  }
  // 만료된 로그인 기록은 개인정보처리방침대로 정리해요. 목록을 열 때 함께 지워요.
  await pool.query(`delete from "session" where "expiresAt" < now()`);
  const { rows } = await pool.query<{
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    status: UserStatus;
    createdAt: Date;
    lastSeenAt: Date | null;
  }>(
    `select u.id, u.name, u.email, u."emailVerified", u.status, u."createdAt",
            (select max(s."updatedAt") from "session" s where s."userId" = u.id) as "lastSeenAt"
       from "user" u
      order by case u.status when 'pending' then 0 when 'approved' then 1 else 2 end, u."createdAt" desc
      limit 1000`,
  );
  const users: AdminUser[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    isAdmin: isAdminEmail(r.email, r.emailVerified),
    createdAt: r.createdAt.toISOString(),
    lastSeenAt: r.lastSeenAt ? r.lastSeenAt.toISOString() : null,
  }));
  return Response.json({ users });
}

const ACTIONS = ["approve", "block", "unblock", "delete", "reset_password"] as const;

/** 헷갈리는 글자(0/O, 1/l/I)를 뺀 12자 임시 비밀번호. */
function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join("");
}
type Action = (typeof ACTIONS)[number];

/** 다른 사이트에서 관리자 브라우저를 이용해 보내는 요청을 막아요(쿠키는 SameSite=Lax라 한 번 더 확인하는 장치). */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "잘못된 요청이에요." }, { status: 403 });
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { action?: unknown; userId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const action = body.action as Action;
  const userId = body.userId;
  if (!ACTIONS.includes(action) || typeof userId !== "string" || !userId || userId.length > 200) {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }

  // 임시 비밀번호는 Better Auth와 같은 해시로 저장해요. 해시 계산이 느려서 트랜잭션 밖에서 먼저 해요.
  let temp: string | null = null;
  let tempHash: string | null = null;
  if (action === "reset_password") {
    temp = tempPassword();
    tempHash = await (await getAuth()!.$context).password.hash(temp);
  }

  const client = await db().connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ email: string; emailVerified: boolean; status: UserStatus }>(
      `select email, "emailVerified", status from "user" where id = $1 for update`,
      [userId],
    );
    const target = rows[0];
    if (!target) {
      await client.query("rollback");
      return Response.json({ error: "이미 지워졌거나 없는 회원이에요. 목록을 새로고침해 주세요." }, { status: 404 });
    }
    if (isAdminEmail(target.email, target.emailVerified)) {
      await client.query("rollback");
      return Response.json({ error: "관리자 계정은 여기서 바꿀 수 없어요. ADMIN_EMAIL·ADMIN_PASSWORD 설정으로 관리해요." }, { status: 400 });
    }
    if (action === "approve" || action === "unblock") {
      await client.query(`update "user" set status = 'approved', "updatedAt" = now() where id = $1`, [userId]);
    } else if (action === "block") {
      // 중지하면 지금 로그인된 기기에서도 바로 로그아웃돼요.
      await client.query(`update "user" set status = 'blocked', "updatedAt" = now() where id = $1`, [userId]);
      await client.query(`delete from "session" where "userId" = $1`, [userId]);
    } else if (action === "reset_password") {
      // 비밀번호를 임시 값으로 바꾸고 로그인된 기기를 모두 로그아웃시켜요. 임시 비밀번호는 이 응답에서 한 번만 보여줘요.
      const updated = await client.query(`update "account" set password = $2, "updatedAt" = now() where "userId" = $1 and "providerId" = 'credential'`, [userId, tempHash]);
      if (updated.rowCount === 0) {
        await client.query("rollback");
        return Response.json({ error: "비밀번호로 가입한 계정이 아니에요." }, { status: 400 });
      }
      await client.query(`delete from "session" where "userId" = $1`, [userId]);
    } else {
      // 거절과 삭제. 로그인 기록과 연결된 계정 정보도 함께 지워져요(on delete cascade).
      await client.query(`delete from "user" where id = $1`, [userId]);
    }
    await client.query("commit");
    console.info(`[admin] ${action} ${userId}`);
    return Response.json(temp ? { ok: true, tempPassword: temp } : { ok: true });
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error("[admin] 처리 실패", e);
    return Response.json({ error: "처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  } finally {
    client.release();
  }
}
