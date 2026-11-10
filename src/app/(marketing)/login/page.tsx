import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthOff } from "@/components/auth/AuthOff";
import { LoginForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/redirect";
import { getViewer } from "@/lib/server/auth";
import { authEnabled } from "@/lib/server/auth-env";

export const metadata: Metadata = { title: "로그인", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(one(sp.next));
  const h = await headers();
  if (!authEnabled()) return <AuthOff />;
  // 이미 로그인했으면 돌아갈 곳으로 보내요. 승인 대기면 앱 쪽에서 대기 화면을 보여줘요.
  if (await getViewer(h)) redirect(next);
  return <LoginForm next={next} deleted={one(sp.deleted) === "1"} />;
}
