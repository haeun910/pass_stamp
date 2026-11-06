"use client";
import { useState } from "react";
import { EvaluatorStep, InterviewStep, ResearchStep, WriterStep } from "@/components/Steps";
import { useStore } from "@/lib/store";

const STEPS = [
  { key: "research", title: "회사 리서치", desc: "인재상·직무 요건 조사" },
  { key: "writer", title: "서류 작성", desc: "이력서·자소서·포트폴리오" },
  { key: "evaluator", title: "회사 기준 평가", desc: "점수와 개선점" },
  { key: "interviewer", title: "모의 면접", desc: "꼬리질문과 피드백" },
] as const;

export default function Home() {
  const { state, active, updateApp, addApp, removeApp, select, setExperience } = useStore();
  const [step, setStep] = useState(0);

  if (!state || !active) return null;

  const done = [!!active.companyProfile, !!active.document.trim(), !!active.evaluation, active.interview.length > 2];
  const props = {
    app: active,
    update: (p: Partial<typeof active>) => updateApp(active.id, p),
    myExperience: state.myExperience,
    setExperience,
    ctx: {
      company: active.company,
      role: active.role,
      jobPosting: active.jobPosting,
      companyProfile: active.companyProfile,
      myExperience: state.myExperience,
      docType: active.docType,
      docRequest: active.docRequest,
      document: active.document,
    },
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-zinc-200 bg-white p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">면</div>
          <div>
            <h1 className="font-bold leading-tight">온라인 면접관</h1>
            <p className="text-xs text-zinc-500">AI 취업 준비 에이전트</p>
          </div>
        </div>
        <button
          onClick={() => { addApp(); setStep(0); }}
          className="mb-3 w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + 새 지원
        </button>
        <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {state.applications.map((a) => (
            <li key={a.id} className="group shrink-0">
              <div
                className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${a.id === active.id ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                onClick={() => select(a.id)}
              >
                <span className="truncate">{a.company || "새 지원"}{a.role && <span className="ml-1 text-xs text-zinc-500">{a.role}</span>}</span>
                <button
                  className="ml-2 hidden text-zinc-400 hover:text-red-500 group-hover:inline"
                  onClick={(e) => { e.stopPropagation(); if (confirm("이 지원 건을 삭제할까요?")) removeApp(a.id); }}
                  aria-label="삭제"
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 hidden text-xs leading-relaxed text-zinc-400 md:block">데이터는 이 브라우저에만 저장돼요.</p>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        <nav className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={`rounded-xl border p-3 text-left transition ${step === i ? "border-indigo-600 bg-white shadow-sm ring-2 ring-indigo-600/15 dark:bg-zinc-900" : "border-zinc-200 bg-white/60 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/40"}`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done[i] ? "bg-emerald-500 text-white" : step === i ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"}`}>
                  {done[i] ? "✓" : i + 1}
                </span>
                <span className="text-sm font-semibold">{s.title}</span>
              </div>
              <p className="mt-1 pl-8 text-xs text-zinc-500">{s.desc}</p>
            </button>
          ))}
        </nav>

        {step === 0 && <ResearchStep {...props} />}
        {step === 1 && <WriterStep {...props} />}
        {step === 2 && <EvaluatorStep {...props} />}
        {step === 3 && <InterviewStep {...props} />}

        {step < 3 && (
          <div className="mt-6 flex justify-end">
            <button onClick={() => setStep(step + 1)} className="text-sm font-medium text-indigo-600 hover:underline">
              다음: {STEPS[step + 1].title} →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
