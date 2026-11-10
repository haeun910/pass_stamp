import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { SITE } from "@/lib/site";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule/70 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={`${SITE.name} 홈`}>
            <Wordmark size={30} />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/#features" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-brand-900 sm:block dark:text-slate-300 dark:hover:text-white">기능</Link>
            {!SITE.beta && <Link href="/pricing" className="rounded-lg px-3 py-2 text-slate-600 hover:text-brand-900 dark:text-slate-300 dark:hover:text-white">요금</Link>}
            <Link href="/#faq" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-brand-900 sm:block dark:text-slate-300 dark:hover:text-white">자주 묻는 질문</Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:text-brand-900 dark:text-slate-300 dark:hover:text-white">로그인</Link>
            <Link href="/app" className="ml-1 inline-flex h-9 items-center rounded-lg bg-brand-900 px-4 font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950">
              시작하기
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  const b = SITE.business;
  return (
    <footer className="border-t border-rule bg-sheet">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Wordmark size={26} />
          <p className="max-w-md text-sm text-slate-500">{SITE.tagline}</p>
          <dl className="grid gap-x-4 gap-y-0.5 text-xs text-slate-500 sm:grid-cols-[auto_1fr]">
            <dt>상호</dt><dd>{b.company}</dd>
            <dt>대표자</dt><dd>{b.ceo}</dd>
            <dt>사업자등록번호</dt><dd>{b.registrationNumber}</dd>
            <dt>통신판매업 신고번호</dt><dd>{b.mailOrderNumber}</dd>
            <dt>주소</dt><dd>{b.address}</dd>
            <dt>고객센터</dt><dd>{b.phone}, {SITE.supportEmail}</dd>
          </dl>
        </div>
        <nav className="flex flex-wrap content-start gap-x-5 gap-y-2 text-sm text-slate-600 md:flex-col dark:text-slate-300">
          {!SITE.beta && <Link href="/pricing" className="hover:text-brand-900 dark:hover:text-white">요금</Link>}
          <Link href="/terms" className="hover:text-brand-900 dark:hover:text-white">이용약관</Link>
          <Link href="/privacy" className="font-semibold hover:text-brand-900 dark:hover:text-white">개인정보처리방침</Link>
          <a href={`mailto:${SITE.supportEmail}`} className="hover:text-brand-900 dark:hover:text-white">문의하기</a>
        </nav>
      </div>
      <div className="border-t border-rule py-4 text-center text-xs text-slate-400">© {new Date().getFullYear()} {SITE.name}</div>
    </footer>
  );
}
