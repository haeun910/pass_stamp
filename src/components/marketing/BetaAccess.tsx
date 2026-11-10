import { Eye } from "lucide-react";
import Link from "next/link";
import { DEMO_APP_ID } from "@/lib/demo-id";

const STEPS = [
  { title: "이메일로 이용 신청", body: "이름, 이메일, 비밀번호만 넣으면 신청이 접수돼요. 휴대폰 인증이나 카드 등록은 없어요." },
  { title: "운영자 승인", body: "비공개 베타라 운영자가 신청을 한 분씩 확인하고 승인해요. 승인 전에도 예시 결과는 볼 수 있어요." },
  { title: "베타 기간에는 무료", body: "승인되면 회사 리서치부터 모의 면접까지 모든 기능을 무료로 써요. 정식 요금제는 출시 때 공개해요." },
];

/** 비공개 베타 동안 요금제 자리에 보여주는 이용 방법 안내예요. */
export function BetaAccess() {
  return (
    <div>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-xl bg-sheet p-6 ring-1 ring-rule">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand-900 font-serif text-sm font-bold text-white dark:bg-brand-200 dark:text-brand-950">
              {i + 1}
            </span>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link href="/signup" className="inline-flex h-12 items-center rounded-lg bg-brand-900 px-6 text-[15px] font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950">
          이용 신청하기
        </Link>
        <Link
          href={`/apply/${DEMO_APP_ID}?tab=overview`}
          className="inline-flex h-12 items-center gap-1.5 rounded-lg px-4 text-[15px] font-semibold text-brand-900 hover:bg-brand-900/5 dark:text-brand-200"
        >
          <Eye className="size-4" />
          예시 결과 먼저 보기
        </Link>
      </div>
    </div>
  );
}
