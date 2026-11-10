"use client";
import { Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Initial } from "@/components/auth/AccountBox";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui";
import { DeleteAccount } from "@/components/auth/DeleteAccount";
import { signOutTo } from "@/lib/auth-client";
import { DEMO_APP_ID } from "@/lib/demo-id";
import { SITE } from "@/lib/site";
import type { Viewer } from "@/lib/viewer";

/** 승인 대기, 또는 이용이 중지된 계정에게 앱 대신 보여주는 화면이에요. */
export function WaitingScreen({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [checked, setChecked] = useState(false);
  const blocked = viewer.status === "blocked";

  // 다른 탭에 있다가 돌아오면 승인 여부를 다시 확인해요. 승인됐으면 이 화면이 바로 앱으로 바뀌어요.
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const check = () => {
    setChecked(true);
    startRefresh(() => router.refresh());
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <Link href="/" aria-label={`${SITE.name} 홈`}>
        <Wordmark size={30} />
      </Link>
      <section className="mt-8 w-full max-w-md rounded-xl bg-sheet p-6 ring-1 ring-rule sm:p-8">
        <div className="flex items-center gap-3">
          <Initial name={viewer.name || viewer.email} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-white">{viewer.name || "이름 없음"}</p>
            <p className="truncate text-sm text-slate-500">{viewer.email}</p>
          </div>
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold text-brand-900 dark:text-white">
          {blocked ? "이용이 중지된 계정이에요" : "이용 신청이 접수됐어요"}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          {blocked ? (
            <>운영자가 이 계정의 이용을 중지했어요. 문의는 {SITE.supportEmail}로 보내 주세요.</>
          ) : (
            <>지금은 비공개 베타라 운영자가 승인한 분만 쓸 수 있어요. 승인되면 이 화면에서 바로 시작할 수 있어요.</>
          )}
        </p>

        {!blocked && (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={check} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin motion-reduce:animate-none" : ""} />
              승인됐는지 확인
            </Button>
            <Link href={`/apply/${DEMO_APP_ID}?tab=overview`}>
              <Button variant="secondary">
                <Eye />예시 결과 보기
              </Button>
            </Link>
          </div>
        )}
        <p role="status" className="mt-3 min-h-5 text-sm text-slate-500">
          {checked && !refreshing && !blocked ? "아직 승인 전이에요. 승인되면 이 화면이 앱으로 바뀌어요." : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-rule pt-4 text-sm">
          <Button variant="ghost" onClick={() => signOutTo("/login")}>
            로그아웃
          </Button>
          {!blocked && <DeleteAccount label="신청 취소" confirmText="신청을 취소하면 신청 기록(이름, 이메일)이 바로 지워져요. 계속하려면 비밀번호를 입력해 주세요." />}
        </div>
      </section>
    </div>
  );
}
