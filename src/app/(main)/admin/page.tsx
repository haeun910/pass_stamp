import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { AdminUsers } from "@/components/auth/AdminUsers";
import { Empty } from "@/components/ui";
import { getViewer } from "@/lib/server/auth";
import { authEnabled } from "@/lib/server/auth-env";

export const metadata: Metadata = { title: "가입 신청 관리" };

/** 관리자만 들어와요. 관리자가 아니면 없는 페이지처럼 보여서 관리 화면이 있다는 것도 드러내지 않아요. */
export default async function AdminPage() {
  const h = await headers();
  if (!authEnabled()) {
    return <Empty title="로그인이 꺼져 있어요">DATABASE_URL과 BETTER_AUTH_SECRET을 넣으면 로그인과 가입 신청 관리를 쓸 수 있어요.</Empty>;
  }
  const viewer = await getViewer(h);
  if (!viewer?.isAdmin) notFound();
  return <AdminUsers selfId={viewer.id} />;
}
