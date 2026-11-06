export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-3xl font-bold text-brand-900 dark:text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">시행일 {updated}</p>
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
        초안이에요. 대괄호 [ ] 부분을 채우고, 결제 기능을 열기 전에 법률 전문가의 검토를 받아 주세요.
      </p>
      <div className="prose prose-slate mt-8 max-w-none prose-h2:font-serif prose-h2:text-lg prose-h2:text-brand-900 prose-li:my-0.5 dark:prose-invert dark:prose-h2:text-white">
        {children}
      </div>
    </article>
  );
}
