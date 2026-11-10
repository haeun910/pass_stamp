import { getAuth } from "@/lib/server/auth";

// 로그인, 로그아웃, 세션 확인, 회원 탈퇴 요청을 Better Auth가 처리해요. 로그인이 꺼져 있으면 없는 주소처럼 답해요.
export const dynamic = "force-dynamic";

async function handle(req: Request) {
  const auth = getAuth();
  if (!auth) return Response.json({ error: "로그인이 설정되지 않았어요." }, { status: 404 });
  return auth.handler(req);
}

export { handle as GET, handle as POST };
