"use client";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { ScoreStamp } from "@/components/brand";
import { Badge, Button, Card, Field, inputCls } from "@/components/ui";
import { appProgress } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { dDay, formatDate } from "@/lib/text";
import { APP_STATUSES } from "@/lib/types";
import { PanelProps, TabKey } from "./shared";

export function OverviewPanel({ app, goTab }: PanelProps) {
  const { updateApp, deleteApp } = useStore();
  const router = useRouter();
  const p = appProgress(app);
  const d = dDay(app.deadline);
  const update = (patch: Parameters<typeof updateApp>[1]) => updateApp(app.id, patch);

  const interviews = app.interviews.filter((s) => s.report);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-5">
        <Card title="준비 현황" subtitle={`${p.doneCount} / 4 단계 완료`}>
          <ol className="space-y-2">
            {p.steps.map((s, i) => (
              <li key={s.key}>
                <button
                  onClick={() => goTab(s.key as TabKey)}
                  className="flex w-full items-center gap-3 rounded-xl border border-rule px-4 py-3 text-left transition hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${s.done ? "bg-pass text-white" : p.nextStep?.key === s.key ? "bg-brand-900 text-white dark:bg-brand-200 dark:text-brand-950" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}
                  >
                    {s.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-xs text-slate-500">{stepDetail(s.key, app, p)}</span>
                  </span>
                  {p.nextStep?.key === s.key && <Badge tone="brand">다음 차례</Badge>}
                </button>
              </li>
            ))}
          </ol>
        </Card>

        {(p.docScore != null || interviews.length > 0) && (
          <Card title="점수">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat kind="서류" label="서류 평균 (최근 채점)" value={p.docScore} />
              <Stat kind="면접" label={interviews.length ? `최근 면접 (총 ${interviews.length}회)` : "면접"} value={p.interviewScore} />
            </div>
            {interviews.length > 1 && (
              <p className="mt-3 text-xs text-slate-500">
                면접 점수 변화 {interviews.map((s) => s.score ?? "-").join(", ")}
              </p>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-5">
        <Card title="지원 정보">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="진행 상태">
                <select className={inputCls} value={app.status} onChange={(e) => update({ status: e.target.value as typeof app.status })}>
                  {APP_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="서류 마감일" right={d && <Badge tone={d.tone === "urgent" ? "red" : d.tone === "soon" ? "amber" : "slate"}>{d.label}</Badge>}>
                <input type="date" className={inputCls} value={app.deadline} onChange={(e) => update({ deadline: e.target.value })} />
              </Field>
            </div>
            <Field label="메모" hint="전형 일정, 연락받은 내용, 면접 후기 등">
              <textarea className={`${inputCls} h-32`} value={app.memo} onChange={(e) => update({ memo: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{formatDate(app.createdAt, false)} 추가</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (confirm(`${app.company || "이 지원 건"}의 리서치, 서류, 면접 기록을 모두 삭제할까요?`)) {
                    deleteApp(app.id);
                    router.push("/app");
                  }
                }}
              >
                지원 건 삭제
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, kind }: { label: string; value: number | null; kind: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-rule p-4">
      {value != null ? (
        <ScoreStamp score={value} size={64} label={kind} rotate={-6} />
      ) : (
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-rule text-xs text-slate-400">{kind}</span>
      )}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-slate-500">{value == null ? "아직 점수가 없어요" : value >= 80 ? "합격권이에요" : `합격권까지 ${80 - value}점 남았어요`}</div>
      </div>
    </div>
  );
}

function stepDetail(key: string, app: PanelProps["app"], p: ReturnType<typeof appProgress>) {
  switch (key) {
    case "research":
      return app.companyProfile ? `${formatDate(app.researchedAt)} 조사 완료` : "인재상과 평가 기준을 먼저 조사해요";
    case "docs":
      return p.docCount ? `서류 ${p.docCount}개 (${app.docs.map((d) => d.title).join(", ")})` : "자소서, 이력서, 포트폴리오를 회사에 맞춰 써요";
    case "evaluate":
      return p.docScore != null ? `최근 채점 평균 ${p.docScore}점` : "회사 기준으로 채점받고 고쳐요";
    case "interview":
      return p.interviewCount ? `${p.interviewCount}회 연습 · 최근 ${p.interviewScore ?? "-"}점` : "꼬리질문까지 나오는 실전 연습";
    default:
      return "";
  }
}
