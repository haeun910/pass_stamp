// 자동 테스트용 회원·세션 만들기. Google·카카오 화면을 거칠 수 없어서 DB에 직접 넣고,
// Better Auth와 같은 방식(토큰 + "." + HMAC-SHA256(BETTER_AUTH_SECRET, 토큰)의 base64)으로 쿠키를 서명해요.
// 테스트 서버와 같은 DATABASE_URL, BETTER_AUTH_SECRET이 필요해요. 운영 DB에는 쓰지 마세요.
const { Client } = require('pg');
const crypto = require('crypto');

const rid = () => crypto.randomBytes(16).toString('hex');

async function connect() {
  if (!process.env.DATABASE_URL || !process.env.BETTER_AUTH_SECRET) {
    throw new Error('DATABASE_URL과 BETTER_AUTH_SECRET이 필요해요 (테스트 서버와 같은 값).');
  }
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  /** 이메일로 회원을 찾거나 만들고, 상태(pending/approved/blocked)를 맞춰요. */
  async function makeUser(email, name, status) {
    const existing = await db.query('select id from "user" where email = $1', [email]);
    if (existing.rows[0]) {
      await db.query('update "user" set status = $2 where id = $1', [existing.rows[0].id, status]);
      return existing.rows[0].id;
    }
    const id = rid();
    await db.query('insert into "user" (id, name, email, "emailVerified", status) values ($1, $2, $3, true, $4)', [id, name, email, status]);
    await db.query(`insert into account (id, "accountId", "providerId", "userId", "updatedAt") values ($1, $2, 'google', $3, now())`, [rid(), rid(), id]);
    return id;
  }

  /** 세션을 만들고 Playwright addCookies에 넣을 쿠키를 돌려줘요. createdAgo로 오래된 세션을 흉내 내요. */
  async function sessionCookie(userId, createdAgo = '0 seconds', host = 'localhost') {
    const token = crypto.randomBytes(24).toString('base64url');
    await db.query(
      `insert into session (id, "expiresAt", token, "createdAt", "updatedAt", "userId") values ($1, now() + interval '7 days', $2, now() - $4::interval, now(), $3)`,
      [rid(), token, userId, createdAgo],
    );
    const sig = crypto.createHmac('sha256', process.env.BETTER_AUTH_SECRET).update(token).digest('base64');
    return { name: 'better-auth.session_token', value: encodeURIComponent(`${token}.${sig}`), domain: host, path: '/', httpOnly: true, sameSite: 'Lax' };
  }

  return { db, makeUser, sessionCookie };
}

module.exports = { connect };
