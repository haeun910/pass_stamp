import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthOff } from "@/components/auth/AuthOff";
import { SignupForm } from "@/components/auth/AuthForms";
import { getViewer } from "@/lib/server/auth";
import { authEnabled } from "@/lib/server/auth-env";

export const metadata: Metadata = { title: "이용 신청", robots: { index: false, follow: false } };

export default async function SignupPage() {
  const h = await headers();
  if (!authEnabled()) return <AuthOff />;
  if (await getViewer(h)) redirect("/app");
  return <SignupForm />;
}
