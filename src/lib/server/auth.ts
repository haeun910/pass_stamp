import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { SITE } from "@/lib/site";
import type { UserStatus, Viewer } from "@/lib/viewer";
import { adminEmail, authEnabled, isAdminEmail } from "./auth-env";
import { db } from "./db";

export const BLOCKED_ERROR = "account_blocked";
export const RESERVED_EMAIL_ERROR = "email_reserved";

function createAuth() {
  return betterAuth({
    appName: SITE.name,
    // 배포 주소. 비워 두면 요청 주소에서 짐작하지만, 배포에서는 넣어 두는 게 안전해요.
    baseURL: process.env.BETTER_AUTH_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
    database: db(),
    // 자체 로그인(이메일 + 비밀번호). 승인제라 메일 인증은 하지 않고, 운영자가 신청을 보고 수락해요.
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    user: {
      additionalFields: {
        // input: false라 이용자가 가입이나 정보 수정 요청으로 이 값을 바꿀 수 없어요.
        status: { type: "string", required: false, defaultValue: "pending", input: false },
      },
      // 회원 탈퇴. 비밀번호를 다시 확인해요(비밀번호 없이 부르면 로그인한 지 하루 안의 세션만 허용).
      deleteUser: { enabled: true },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    // 비밀번호 대입을 막는 요청 제한. 서버가 여러 개여도 함께 세도록 DB에 기록해요(프로덕션에서만 켜져요).
    rateLimit: {
      storage: "database",
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/change-password": { window: 300, max: 5 },
        "/delete-user": { window: 300, max: 5 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // 스스로 가입한 사람은 모두 승인 대기로 시작해요. 관리자 이메일은 관리자 계정 몫이라 가입을 막아요.
          before: async (user) => {
            if (adminEmail() && user.email.trim().toLowerCase() === adminEmail()) {
              throw new APIError("BAD_REQUEST", { code: RESERVED_EMAIL_ERROR, message: "이 이메일로는 가입할 수 없어요." });
            }
            return { data: { ...user, status: "pending" } };
          },
        },
      },
      session: {
        create: {
          // 이용이 중지된 계정은 로그인 세션을 만들지 않아요. 로그인 화면에 이유를 보여줘요.
          before: async (session) => {
            const { rows } = await db().query<{ email: string; emailVerified: boolean; status: string | null }>(
              'select email, "emailVerified", status from "user" where id = $1',
              [session.userId],
            );
            const u = rows[0];
            if (u?.status === "blocked" && !isAdminEmail(u.email, u.emailVerified)) {
              throw new APIError("FORBIDDEN", { code: BLOCKED_ERROR, message: "이용이 중지된 계정이에요." });
            }
          },
        },
      },
    },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const g = globalThis as unknown as { __passStampAuth?: Auth };

/** 로그인이 꺼져 있으면(DATABASE_URL이나 BETTER_AUTH_SECRET이 없으면) null이에요. */
export function getAuth(): Auth | null {
  if (!authEnabled()) return null;
  if (!g.__passStampAuth) g.__passStampAuth = createAuth();
  return g.__passStampAuth;
}

/** 요청의 세션 쿠키로 로그인한 사람을 찾아요. 매번 DB에서 상태를 읽어서 관리자가 바꾼 상태가 바로 적용돼요. */
export async function getViewer(headers: Headers): Promise<Viewer | null> {
  const auth = getAuth();
  if (!auth) return null;
  const s = await auth.api.getSession({ headers });
  if (!s) return null;
  const u = s.user as typeof s.user & { status?: string | null };
  const isAdmin = isAdminEmail(u.email, u.emailVerified);
  const status: UserStatus = isAdmin ? "approved" : u.status === "approved" || u.status === "blocked" ? u.status : "pending";
  return { id: u.id, name: u.name, email: u.email, image: u.image ?? null, status, isAdmin };
}
