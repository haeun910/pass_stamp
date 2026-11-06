import { Check } from "lucide-react";
import Link from "next/link";
import { PLANS, won } from "@/lib/site";

export function Pricing() {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-xl bg-sheet p-6 ${p.highlight ? "ring-2 ring-brand-900 dark:ring-brand-200" : "ring-1 ring-rule"}`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 rounded-md bg-brand-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-brand-200 dark:text-brand-950">
                가장 많이 골라요
              </span>
            )}
            <h3 className="font-serif text-lg font-bold text-brand-900 dark:text-white">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{p.summary}</p>
            <p className="mt-5 flex items-baseline gap-1">
              <span className="font-serif text-3xl font-bold tabular-nums text-brand-900 dark:text-white">{won(p.price)}</span>
              {p.period && <span className="text-sm text-slate-500">/ {p.period}</span>}
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 size-4 shrink-0 text-pass" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/app"
              className={`mt-6 inline-flex h-11 items-center justify-center rounded-lg text-sm font-semibold transition ${p.highlight ? "bg-brand-900 text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950" : "border border-rule text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"}`}
            >
              {p.price === 0 ? "무료로 시작하기" : `${p.name}로 시작하기`}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        * 서류 작성·첨삭 무제한은 한 사람이 정상적으로 쓰는 범위를 기준으로 해요. 가격은 부가세 포함이고, 구독은 언제든 해지할 수 있어요.
      </p>
    </div>
  );
}
