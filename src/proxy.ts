import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_APP_ID } from "@/lib/demo-id";
import { authEnabled } from "@/lib/server/auth-env";

/**
 * 앱 화면은 로그인한 사람만 열어요. 여기서는 세션 쿠키가 있는지만 빠르게 보고,
 * 진짜 확인(쿠키 서명, 만료, 승인 상태)은 화면을 그리는 서버와 각 API가 다시 해요.
 * 랜딩의 "결과 미리보기"(예시 지원 건)는 로그인 없이 볼 수 있어요.
 */
export function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const { pathname, searchParams } = req.nextUrl;

  const isDemo = pathname === `/apply/${DEMO_APP_ID}` || pathname.startsWith(`/print/${DEMO_APP_ID}/`);
  if (isDemo || getSessionCookie(req)) return NextResponse.next();

  // 예전 미리보기 주소(/app?demo=1)는 로그인 없이 예시 지원 건으로 보내요.
  if (pathname === "/app" && searchParams.get("demo") === "1") {
    return NextResponse.redirect(new URL(`/apply/${DEMO_APP_ID}?tab=overview`, req.url));
  }
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/app", "/profile", "/settings", "/admin", "/apply/:path*", "/print/:path*"],
};
