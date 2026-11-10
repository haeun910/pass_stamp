import { headers } from "next/headers";
import { PrintStore } from "@/components/auth/PrintStore";
import { getViewer } from "@/lib/server/auth";
import { authEnabled } from "@/lib/server/auth-env";

/** 인쇄 화면도 앱과 같은 계정별 저장소를 읽어요. 승인 전이거나 로그인 전이면 예시만 있는 손님 저장소를 읽어요. */
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  // 요청마다 서버에서 그려요. 빌드할 때의 환경 변수로 정적 화면이 굳어 로그인 확인이 빠지는 일을 막아요.
  const h = await headers();
  const auth = authEnabled();
  const viewer = auth ? await getViewer(h) : null;
  return (
    <PrintStore auth={auth} memberId={viewer?.status === "approved" ? viewer.id : null}>
      {children}
    </PrintStore>
  );
}
