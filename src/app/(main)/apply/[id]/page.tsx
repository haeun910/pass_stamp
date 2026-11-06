"use client";
import { Check, ChevronLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";
import { DocsPanel, PendingRevision } from "@/components/apply/Docs";
import { EvaluatePanel } from "@/components/apply/Evaluate";
import { InterviewPanel } from "@/components/apply/Interview";
import { OverviewPanel } from "@/components/apply/Overview";
import { ResearchPanel } from "@/components/apply/Research";
import { TabKey } from "@/components/apply/shared";
import { Badge, Button, Empty } from "@/components/ui";
import { appProgress } from "@/lib/progress";
import { useApp, useStore } from "@/lib/store";
import { dDay } from "@/lib/text";

const TABS: { key: TabKey; label: string; step?: number }[] = [
  { key: "overview", label: "개요" },
  { key: "research", label: "회사 리서치", step: 1 },
  { key: "docs", label: "서류 작성", step: 2 },
  { key: "evaluate", label: "회사 기준 채점", step: 3 },
  { key: "interview", label: "면접 연습", step: 4 },
];

export default function ApplyPage() {
  return (
    <Suspense>
      <Apply />
    </Suspense>
  );
}

function Apply() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const app = useApp(id);
  const { data } = useStore();
  const tab = (TABS.find((t) => t.key === search.get("tab"))?.key ?? "overview") as TabKey;
  const [docId, setDocId] = useState<string | null>(search.get("doc"));
  const [pending, setPending] = useState<PendingRevision | null>(null);

  const goTab = useCallback(
    (t: TabKey, extra?: Record<string, string>) => {
      if (extra?.doc) setDocId(extra.doc);
      router.replace(`/apply/${id}?tab=${t}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [id, router],
  );

  if (!app) {
    return (
      <Empty icon={<SearchX />} title="지원 회사를 찾을 수 없어요">
        지원 건을 찾을 수 없어요. 삭제됐거나 다른 브라우저에서 만든 지원 건일 수 있어요.
        <div className="mt-4">
          <Link href="/app"><Button variant="secondary">홈으로</Button></Link>
        </div>
      </Empty>
    );
  }

  const p = appProgress(app);
  const d = dDay(app.deadline);
  const props = { app, profile: data.profile, goTab };
  const done: Record<string, boolean> = Object.fromEntries(p.steps.map((s) => [s.key, s.done]));

  return (
    <div className="space-y-6">
      <header>
        <Link href="/app" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-900 dark:hover:text-white">
          <ChevronLeft className="size-3.5" />지원 현황
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-[26px] font-bold leading-tight tracking-tight text-brand-900 dark:text-white">{app.company || "새 지원"}</h1>
            <p className="mt-1 text-sm text-slate-500">{app.role || "회사 리서치에서 회사와 직무를 정해 주세요"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={app.status === "최종 합격" ? "green" : app.status === "불합격" ? "red" : "slate"}>{app.status}</Badge>
            {d && <Badge tone={d.tone === "urgent" ? "red" : d.tone === "soon" ? "amber" : "slate"}>마감 {d.label}</Badge>}
          </div>
        </div>
      </header>

      <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-1 border-b border-rule">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => goTab(t.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition ${tab === t.key ? "border-brand-900 font-semibold text-brand-900 dark:border-brand-200 dark:text-white" : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"}`}
            >
              {t.step && (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${done[t.key] ? "bg-pass text-white" : tab === t.key ? "bg-brand-900 text-white dark:bg-brand-200 dark:text-brand-950" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {done[t.key] ? <Check className="size-3" strokeWidth={3} /> : t.step}
                </span>
              )}
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* 탭을 옮겨도 진행 중인 생성이 끊기지 않도록 모든 패널을 띄워두고 숨기기만 해요. */}
      <div hidden={tab !== "overview"}><OverviewPanel {...props} /></div>
      <div hidden={tab !== "research"}><ResearchPanel {...props} /></div>
      <div hidden={tab !== "docs"}>
        <DocsPanel {...props} docId={docId} setDocId={setDocId} pending={pending} clearPending={() => setPending(null)} />
      </div>
      <div hidden={tab !== "evaluate"}>
        <EvaluatePanel
          {...props}
          docId={docId}
          setDocId={setDocId}
          onRevise={(docId, evaluation) => {
            setDocId(docId);
            setPending({ docId, evaluation });
            goTab("docs");
          }}
        />
      </div>
      <div hidden={tab !== "interview"}><InterviewPanel {...props} /></div>
    </div>
  );
}
