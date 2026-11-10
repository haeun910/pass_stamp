/**
 * 로그인 설정을 환경 변수에서 읽어요. proxy(요청 앞단)에서도 쓰니 DB나 Better Auth를 불러오지 않아요.
 */

/** DB와 비밀값이 있으면 로그인을 켜요. */
export function authEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.BETTER_AUTH_SECRET?.trim());
}

/**
 * 프로덕션에서는 로그인이 반드시 필요해요. 설정이 빠진 채 배포되면 AI 기능을 막아서
 * 주소를 아는 누구나 운영자의 API 비용을 쓰는 일을 막아요. 로컬 개발에서는 설정 없이도 써요.
 */
export function authRequired(): boolean {
  return authEnabled() || process.env.NODE_ENV === "production";
}

/** 관리자 이메일(ADMIN_EMAIL). 소문자로 맞춰요. */
export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || null;
}

/**
 * 관리자인지. 관리자 계정은 빌드할 때 ADMIN_EMAIL·ADMIN_PASSWORD로 만들어지고(scripts/db-migrate.mjs),
 * 그때만 emailVerified가 true가 돼요. 스스로 가입한 계정은 늘 false라서, 같은 이메일로 관리자를 사칭할 수 없어요.
 */
export function isAdminEmail(email: string | null | undefined, emailVerified: boolean | null | undefined): boolean {
  const admin = adminEmail();
  return Boolean(admin && email && emailVerified && email.trim().toLowerCase() === admin);
}
