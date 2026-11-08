"use client";
import { ArrowUpRight, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { ScoreStamp } from "@/components/brand";
import { Badge, Button, PageHeader, ProgressBar } from "@/components/ui";
import { appProgress } from "@/lib/progress";
import { SITE } from "@/lib/site";
import { useStore } from "@/lib/store";
import { dDay, relativeTime } from "@/lib/text";
import { profileFilled } from "@/lib/types";

const FLOW = [
  { title: "회사 리서치", desc: "인재상, 최근 이슈, 직무 요건, 평가 기준을 정리해요." },
  { title: "맞춤 서류", desc: "내 프로필의 실제 경험으로 자소서, 이력서, 포트폴리오를 써요." },
  { title: "회사 기준 채점", desc: "평가관처럼 채점하고, 피드백을 반영한 수정본을 만들어요." },
  { title: "모의 면접", desc: "서류를 읽은 면접관이 꼬리질문까지 하고 피드백을 줘요." },
];

export default function HomePage() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const { ready, data, createApp, addDemoApp } = useStore();
  const router = useRouter();
  const search = useSearchParams();
  const wantsDemo = search.get("demo") === "1";
  const demoHandled = useRef(false);

  // 소개 페이지의 "결과 미리보기"로 들어오면 예시 지원 건을 만들고(이미 있으면 그대로) 개요로 옮겨요.
  useEffect(() => {
    if (!wantsDemo || !ready || demoHandled.current) return;
    demoHandled.current = true;
    router.replace(`/apply/${addDemoApp()}?tab=overview`);
  }, [wantsDemo, ready, addDemoApp, router]);

  const filled = profileFilled(data.profile);
  const apps = [...data.applications].sort((a, b) => b.updatedAt - a.updatedAt);
  const urgent = apps
    .map((a) => ({ a, d: a.status === "준비 중" ? dDay(a.deadline) : null }))
    .filter((x) => x.d && (x.d.tone === "urgent" || x.d.tone === "soon"));

  const newApp = () => router.push(`/apply/${createApp()}?tab=research`);
  const openDemo = () => router.push(`/apply/${addDemoApp()}?tab=overview`);

  if (wantsDemo) {
    return (
      <p role="status" className="py-20 text-center text-sm text-slate-500">
        예시 지원 건을 여는 중이에요…
      </p>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={data.profile.name ? `${data.profile.name}님의 지원 현황` : "지원 현황"}
        description={SITE.tagline}
        actions={<Button onClick={newApp}><Plus />새 지원 회사</Button>}
      />

      {filled < 0.5 && (
        <section className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-brand-950/40">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-brand-900 dark:text-white">먼저 내 프로필을 채워 주세요</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              서류와 면접 에이전트는 프로필에 있는 경험만 써요. 기존 이력서 PDF를 올리면 항목별로 자동 정리해 드려요.
            </p>
            <div className="mt-3 flex max-w-xs items-center gap-3 text-xs text-slate-500">
              <ProgressBar value={filled} />
              <span className="shrink-0 tabular-nums">{Math.round(filled * 100)}%</span>
            </div>
          </div>
          <Link href="/profile"><Button variant="secondary">프로필 채우기</Button></Link>
        </section>
      )}

      {urgent.length > 0 && (
        <section className="rounded-xl border border-pen/30 bg-pen-soft px-5 py-4">
          <h2 className="text-sm font-bold text-pen">마감이 가까워요</h2>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {urgent.map(({ a, d }) => (
              <li key={a.id}>
                <Link href={`/apply/${a.id}`} className="font-medium text-slate-800 underline-offset-2 hover:underline dark:text-slate-100">
                  {a.company}
                </Link>{" "}
                <span className="font-semibold tabular-nums text-pen">{d!.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {apps.length === 0 ? (
        <section>
          <h2 className="font-serif text-lg font-bold text-brand-900 dark:text-white">회사 하나를 이렇게 준비해요</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map((f, i) => (
              <li key={f.title} className="rounded-xl border border-rule bg-sheet p-5">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand-900 font-serif text-sm font-bold text-white dark:bg-brand-200 dark:text-brand-950">{i + 1}</span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={newApp}>첫 지원 회사 추가하기</Button>
            <Button size="lg" variant="secondary" onClick={openDemo}><Eye />예시로 둘러보기</Button>
            <p className="basis-full text-xs text-slate-500 sm:basis-auto">예시는 가상의 회사로 네 단계 결과물이 어떻게 나오는지 보여 줘요.</p>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((a) => {
            const p = appProgress(a);
            const d = a.status === "준비 중" ? dDay(a.deadline) : null;
            const best = p.interviewScore ?? p.docScore;
            return (
              <Link
                key={a.id}
                href={`/apply/${a.id}`}
                className="group relative flex flex-col rounded-xl border border-rule bg-sheet p-5 transition hover:border-brand-300 hover:shadow-[0_14px_30px_-20px_var(--shadow-ink)] dark:hover:border-brand-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 font-serif text-lg font-bold text-brand-900 dark:text-white">
                      <span className="truncate">{a.company || "새 지원"}</span>
                      {a.demo && <span className="shrink-0 rounded bg-marker/60 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-brand-900 dark:bg-marker dark:text-amber-50">예시</span>}
                    </h3>
                    <p className="truncate text-sm text-slate-500">{a.role || "직무를 아직 안 정했어요"}</p>
                  </div>
                  {best != null ? (
                    <ScoreStamp score={best} size={54} label={p.interviewScore != null ? "면접" : "서류"} rotate={-10} />
                  ) : (
                    <ArrowUpRight className="size-5 shrink-0 text-slate-300 transition group-hover:text-brand-700" />
                  )}
                </div>

                <div className="mt-5 flex gap-1" aria-label={`${p.doneCount}/4 단계 완료`}>
                  {p.steps.map((s) => (
                    <div key={s.key} title={s.label} className={`h-1 flex-1 rounded-full ${s.done ? "bg-brand-900 dark:bg-brand-300" : "bg-slate-200 dark:bg-slate-800"}`} />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge tone={a.status === "최종 합격" ? "green" : a.status === "불합격" ? "red" : "slate"}>{a.status}</Badge>
                  {d && <span className={`font-semibold tabular-nums ${d.tone === "urgent" ? "text-pen" : ""}`}>마감 {d.label}</span>}
                  <span className="ml-auto">{p.nextStep ? `다음 할 일: ${p.nextStep.label}` : "모든 단계를 마쳤어요"}</span>
                </div>
                <span className="sr-only">마지막 수정 {relativeTime(a.updatedAt)}</span>
              </Link>
            );
          })}
          <button
            onClick={newApp}
            className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-rule text-sm font-semibold text-slate-500 transition hover:border-brand-400 hover:text-brand-900 dark:hover:text-white"
          >
            <Plus className="size-5" />
            지원 회사 추가
          </button>
        </section>
      )}
    </div>
  );
}
