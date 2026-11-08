"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui";
import { SITE } from "@/lib/site";

/** 화면을 그리다 예상 못 한 오류가 나면 흰 화면 대신 이 안내가 떠요. 데이터는 브라우저에 그대로 있어요. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[합격도장] 화면 오류", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-10">
        <Wordmark size={30} />
      </Link>
      <h1 className="text-lg font-bold">화면을 그리다 문제가 생겼어요</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        저장된 서류와 기록은 그대로 있어요. 다시 시도해도 같은 문제가 나면 설정에서 백업을 내려받은 뒤 {SITE.supportEmail}로 알려 주세요.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">오류 번호 {error.digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>다시 시도</Button>
        <Link href="/app" className="inline-flex h-10 items-center rounded-lg border border-rule px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
          지원 현황으로
        </Link>
      </div>
    </main>
  );
}
