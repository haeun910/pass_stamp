/**
 * 로그인 후 돌아갈 주소. 이 사이트 안의 경로만 받아요.
 * //evil.com, /\evil.com처럼 다른 사이트로 보내는 주소나 로그인 화면 자신은 기본 주소로 바꿔요.
 */
export function safeNext(next: string | null | undefined, fallback = "/app"): string {
  if (!next || typeof next !== "string" || next.length > 2000) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  if (next === "/login" || next.startsWith("/login?")) return fallback;
  return next;
}
