import Link from "next/link";

/** 로그인 설정(DATABASE_URL, BETTER_AUTH_SECRET)이 없는 로컬 개발에서 로그인·가입 화면 대신 보여줘요. */
export function AuthOff() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
      <h1 className="font-serif text-2xl font-bold text-brand-900 dark:text-white">로그인이 꺼져 있어요</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        로컬 개발 모드라 로그인 없이 쓸 수 있어요. 로그인을 켜려면 <code>DATABASE_URL</code>과 <code>BETTER_AUTH_SECRET</code>을 넣어 주세요.
      </p>
      <Link href="/app" className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950">
        앱으로 가기
      </Link>
    </div>
  );
}
