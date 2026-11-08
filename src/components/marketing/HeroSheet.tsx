import { ScoreStamp } from "@/components/brand";

/** 히어로: 첨삭받은 자기소개서 한 장. 빨간펜 교정과 점수 도장이 이 서비스가 하는 일을 그대로 보여줘요. */
export function HeroSheet() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      {/* 뒤에 겹친 종이 두 장: 지원 회사마다 서류가 따로 있다는 느낌 */}
      <div className="absolute inset-x-6 -top-3 h-full rotate-[2.5deg] rounded-md bg-sheet ring-1 ring-rule" aria-hidden />
      <div className="absolute inset-x-3 -top-1.5 h-full -rotate-[1.2deg] rounded-md bg-sheet ring-1 ring-rule" aria-hidden />

      <figure
        className="relative rounded-md bg-sheet px-7 pb-9 pt-7 shadow-[0_30px_60px_-30px_var(--shadow-ink)] ring-1 ring-rule sm:px-10"
        aria-label="첨삭된 자기소개서 예시"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule pb-3 text-xs text-slate-500">
          <span>한빛페이 · 프론트엔드 개발자 · 자기소개서</span>
          <span className="tabular-nums">682 / 700자</span>
        </div>

        <h3 className="mt-5 font-serif text-[15px] font-bold leading-snug text-brand-900 dark:text-white">1. 지원 동기와 입사 후 포부를 작성해 주세요.</h3>

        <div className="mt-3 space-y-3 font-serif text-[14px] leading-[2] text-slate-800 dark:text-slate-200">
          <p>
            결제 화면에서 가장 많이 이탈하는 단계를 찾아 버튼 위치와 문구를 바꾸고, 2주 만에 결제 완료율을 9% 높였습니다.{" "}
            <span className="relative">
              <span className="text-slate-400 line-through decoration-pen decoration-2">저는 사용자의 금융 경험을 개선하고 싶습니다.</span>
            </span>
          </p>
          <p className="relative -mt-1 pl-3 font-sans text-[13.5px] font-medium leading-relaxed text-pen">
            <span className="absolute left-0 top-1.5 h-[calc(100%-0.75rem)] w-0.5 rounded bg-pen/70" aria-hidden />
            한빛페이 송금 화면의 3단계 인증을 한 번에 끝내는 흐름으로 바꾸는 일을 맡고 싶습니다.
          </p>
          <p className="text-slate-300 dark:text-slate-600" aria-hidden>
            ────── ───── ──────── ──── ────── ─────── ──── ─────
          </p>
        </div>

        {/* 여백 메모 */}
        <aside className="mt-5 rounded-md border border-pen/30 bg-pen-soft px-3.5 py-2.5 text-[12.5px] leading-relaxed text-pen sm:absolute sm:-right-10 sm:top-40 sm:mt-0 sm:w-48 sm:rotate-2">
          다른 회사 이름을 넣어도 말이 되는 문장이에요. 이 회사에서만 할 수 있는 일로 바꿔 보세요.
        </aside>

        <div className="absolute -bottom-7 right-6 sm:-right-6">
          <ScoreStamp score={89} size={96} animate rotate={-12} />
        </div>
      </figure>
    </div>
  );
}
