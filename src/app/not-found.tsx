import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Link href="/" className="mb-10">
        <Wordmark size={30} />
      </Link>
      <p className="font-serif text-6xl font-bold text-brand-900 dark:text-white">404</p>
      <h1 className="mt-4 text-lg font-bold">이런 주소의 페이지가 없어요</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        주소가 바뀌었거나 잘못 입력됐을 수 있어요. 브라우저에 저장된 서류와 기록은 그대로 있어요.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/app" className="inline-flex h-11 items-center rounded-lg bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950">
          지원 현황으로
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-rule px-5 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800">
          소개 페이지
        </Link>
      </div>
    </main>
  );
}
