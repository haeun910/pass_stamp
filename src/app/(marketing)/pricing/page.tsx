import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/Pricing";

export const metadata: Metadata = { title: "요금" };

const COMPARE = [
  ["회사 리서치", "1곳", "월 5곳", "월 15곳"],
  ["서류 작성·첨삭·채점", "3회", "무제한*", "무제한*"],
  ["모의 면접", "1회", "월 10회", "월 30회"],
  ["예상 질문", "1회", "무제한*", "무제한*"],
  ["음성 면접", "포함", "포함", "포함"],
  ["압박·임원 면접 모드", "-", "-", "포함"],
  ["버전 비교, PDF 저장, 백업", "포함", "포함", "포함"],
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-3xl font-bold text-brand-900 dark:text-white">요금</h1>
      <p className="mt-2 text-slate-500">한 회사는 무료로 리서치부터 면접 피드백까지 끝까지 준비해 볼 수 있어요.</p>
      <div className="mt-10">
        <Pricing />
      </div>
      <h2 className="mt-16 font-serif text-xl font-bold text-brand-900 dark:text-white">요금제별 비교</h2>
      <div className="mt-5 overflow-x-auto rounded-xl ring-1 ring-rule">
        <table className="w-full min-w-[560px] bg-sheet text-sm">
          <thead>
            <tr className="border-b border-rule text-left">
              <th className="px-4 py-3 font-semibold text-slate-500" />
              <th className="px-4 py-3 font-semibold">체험</th>
              <th className="px-4 py-3 font-semibold">스탠다드</th>
              <th className="px-4 py-3 font-semibold">프로</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map(([label, ...cols]) => (
              <tr key={label} className="border-b border-rule last:border-0">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{label}</td>
                {cols.map((c, i) => (
                  <td key={i} className={`px-4 py-3 tabular-nums ${c === "-" ? "text-slate-400" : "text-slate-900 dark:text-white"}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
