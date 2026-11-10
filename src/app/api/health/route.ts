import { authEnabled, authRequired } from "@/lib/server/auth-env";
import { hasCredentials, isMock } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

/** 화면 위쪽 안내(API 키, 모의 응답, 로그인 설정)에 쓰는 서버 설정 상태예요. 비밀값은 돌려주지 않아요. */
export async function GET() {
  return Response.json({
    hasKey: hasCredentials(),
    mock: isMock(),
    // on: 로그인 사용, off: 로컬 개발이라 로그인 없이 사용, missing: 프로덕션인데 로그인 설정이 빠짐(AI 기능 막힘)
    auth: authEnabled() ? "on" : authRequired() ? "missing" : "off",
  });
}
