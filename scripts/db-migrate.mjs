// 1) db/migrations/*.sql 가운데 아직 넣지 않은 파일을 이름 순서대로 실행하고
// 2) ADMIN_EMAIL·ADMIN_PASSWORD가 있으면 관리자 계정을 만들거나 비밀번호를 그 값으로 맞춰요.
// `npm run build`가 먼저 이 스크립트를 돌려서 Vercel 배포 때 자동으로 처리돼요.
// DATABASE_URL이 없으면(로그인을 안 쓰는 로컬 개발) 아무것도 하지 않아요.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (!process.env.DATABASE_URL && fs.existsSync(p)) {
    try {
      process.loadEnvFile(p);
    } catch {}
  }
}

// Vercel의 Neon 연동은 풀링 없는 주소를 DATABASE_URL_UNPOOLED로 함께 넣어 줘요. 표를 바꾸는 작업은 그쪽이 안전해요.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[db] DATABASE_URL이 없어 건너뛰어요. 로그인 기능은 꺼진 상태로 빌드돼요.");
  process.exit(0);
}

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || "";
const adminPassword = process.env.ADMIN_PASSWORD ?? "";
if (adminEmail && adminPassword.length < 12) {
  console.error("[db] ADMIN_PASSWORD를 12자 이상으로 넣어 주세요. 관리자 계정은 이 비밀번호로 로그인해요.");
  process.exit(1);
}
if (!adminEmail) console.warn("[db] ADMIN_EMAIL이 없어 관리자 계정을 만들지 않아요. 가입 신청을 수락할 사람이 없게 돼요.");

const dir = path.join(root, "db/migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

/**
 * 관리자 계정. Better Auth가 쓰는 것과 같은 해시 함수로 비밀번호를 넣어요.
 * 이미 있으면 비밀번호가 환경 변수 값과 같은지 보고, 다르면 바꾸고 기존 로그인을 모두 끊어요.
 * (누군가 먼저 같은 이메일로 가입해 뒀더라도 이 단계에서 관리자 소유로 되돌아와요.)
 */
async function ensureAdmin(client) {
  const { hashPassword, verifyPassword } = await import("better-auth/crypto");
  const found = await client.query('select id from "user" where lower(email) = $1', [adminEmail]);
  let userId = found.rows[0]?.id;
  if (!userId) {
    userId = crypto.randomBytes(16).toString("hex");
    await client.query(
      `insert into "user" (id, name, email, "emailVerified", status) values ($1, '관리자', $2, true, 'approved')`,
      [userId, adminEmail],
    );
    await client.query(
      `insert into "account" (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`,
      [crypto.randomBytes(16).toString("hex"), userId, await hashPassword(adminPassword)],
    );
    console.log("[db] 관리자 계정을 만들었어요.");
    return;
  }
  await client.query(`update "user" set "emailVerified" = true, status = 'approved', "updatedAt" = now() where id = $1`, [userId]);
  const acct = await client.query(`select id, password from "account" where "userId" = $1 and "providerId" = 'credential'`, [userId]);
  const current = acct.rows[0];
  if (current?.password && (await verifyPassword({ hash: current.password, password: adminPassword }))) return;
  const hash = await hashPassword(adminPassword);
  if (current) await client.query(`update "account" set password = $2, "updatedAt" = now() where id = $1`, [current.id, hash]);
  else
    await client.query(
      `insert into "account" (id, "accountId", "providerId", "userId", password, "updatedAt") values ($1, $2, 'credential', $2, $3, now())`,
      [crypto.randomBytes(16).toString("hex"), userId, hash],
    );
  await client.query(`delete from "session" where "userId" = $1`, [userId]);
  console.log("[db] 관리자 비밀번호를 ADMIN_PASSWORD 값으로 맞추고 기존 로그인을 끊었어요.");
}

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 15_000 });
try {
  await client.connect();
  await client.query("begin");
  // 빌드가 동시에 두 번 돌아도 같은 파일을 두 번 실행하지 않게 잠가요. 트랜잭션이 끝나면 풀려요.
  await client.query("select pg_advisory_xact_lock(7271104)");
  await client.query('create table if not exists "_migrations" ("name" text primary key, "appliedAt" timestamptz not null default now())');
  const { rows } = await client.query('select "name" from "_migrations"');
  const done = new Set(rows.map((r) => r.name));
  const pending = files.filter((f) => !done.has(f));
  for (const f of pending) {
    await client.query(fs.readFileSync(path.join(dir, f), "utf8"));
    await client.query('insert into "_migrations" ("name") values ($1)', [f]);
    console.log(`[db] 적용: ${f}`);
  }
  console.log(pending.length ? `[db] 마이그레이션 ${pending.length}개를 적용했어요.` : "[db] 새로 적용할 마이그레이션이 없어요.");
  if (adminEmail) await ensureAdmin(client);
  await client.query("commit");
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("[db] 실패했어요. 아무것도 바뀌지 않았어요.", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
