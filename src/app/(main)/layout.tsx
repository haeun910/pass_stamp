import { headers } from "next/headers";
import { AppShell } from "@/components/AppShell";
import { getViewer } from "@/lib/server/auth";
import { authEnabled } from "@/lib/server/auth-env";

/**
 * 앱 화면의 바깥 틀. 서버에서 세션을 확인해 로그인한 사람과 승인 상태를 넘겨요.
 * 승인 대기면 대기 화면을, 세션이 없으면 로그인 화면으로 보내요(예시 지원 건은 예외).
 */
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  // 요청마다 서버에서 그려요. 빌드할 때의 환경 변수로 정적 화면이 굳어 로그인 확인이 빠지는 일을 막아요.
  const h = await headers();
  const auth = authEnabled();
  const viewer = auth ? await getViewer(h) : null;
  return (
    <AppShell auth={auth} viewer={viewer}>
      {children}
    </AppShell>
  );
}
