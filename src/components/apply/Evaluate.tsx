"use client";
import { ClipboardCheck, FileText } from "lucide-react";
import { useState } from "react";
import { ScoreStamp } from "@/components/brand";
import { Markdown } from "@/components/Markdown";
import { AgentStatus, Badge, Button, Card, Empty, scoreTone } from "@/components/ui";
import { docContext, useAgent } from "@/lib/client";
import { useStore } from "@/lib/store";
import { formatDate, parseScore } from "@/lib/text";
import { Doc, Evaluation, uid } from "@/lib/types";
import { PanelProps, latestVersionId, withSnapshot } from "./shared";

export function EvaluatePanel({
  app,
  profile,
  goTab,
  docId,
  setDocId,
  onRevise,
}: PanelProps & { docId: string | null; setDocId: (id: string) => void; onRevise: (docId: string, evaluation: string) => void }) {
  const { updateDoc } = useStore();
  const agent = useAgent();
  const docs = app.docs.filter((d) => d.content.trim());
  const doc = docs.find((d) => d.id === docId) ?? docs[0] ?? null;
  const [streaming, setStreaming] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  if (!doc) {
    return (
      <Card>
        <Empty icon={<FileText />} title="채점할 서류가 없어요" action={<Button onClick={() => goTab("docs")}>서류 쓰러 가기</Button>}>
          서류 탭에서 새로 쓰거나, 이미 쓴 자기소개서를 붙여넣으면 바로 채점할 수 있어요.
        </Empty>
      </Card>
    );
  }

  const evals = doc.evaluations;
  const shown: Evaluation | undefined = viewId ? evals.find((e) => e.id === viewId) : evals[evals.length - 1];
  const changedSince = shown && shown.versionId !== latestVersionId(doc);

  const evaluate = async () => {
    setViewId(null);
    updateDoc(app.id, doc.id, (d) => withSnapshot(d, "직접 수정"));
    setStreaming("");
    const res = await agent.run(
      "evaluator",
      docContext(app, profile, doc),
      { instruction: `${app.company || "지원 회사"}의 서류 평가관으로서 이 ${doc.type}를 평가해 주세요.` },
      setStreaming,
    );
    if (res.ok && !res.stopped) {
      updateDoc(app.id, doc.id, (d) => ({
        evaluations: [
          ...d.evaluations,
          { id: uid(), versionId: latestVersionId(d) ?? "", content: res.text, score: parseScore(res.text), at: Date.now() },
        ].slice(-20),
      }));
    }
    setStreaming("");
  };

  // 서류 탭으로 넘어가서 진행 상황과 결과를 바로 보여줘요.
  const revise = (ev: Evaluation) => onRevise(doc.id, ev.content);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="space-y-5">
        <Card title="채점할 서류">
          <div className="space-y-1">
            {docs.map((d) => (
              <DocRow key={d.id} doc={d} active={d.id === doc.id} onClick={() => { setDocId(d.id); setViewId(null); }} />
            ))}
          </div>
        </Card>
        {evals.length > 1 && (
          <Card title="점수 변화">
            <ScoreTrend evals={evals} activeId={shown?.id} onPick={setViewId} />
          </Card>
        )}
      </div>

      <Card
        title={`${app.company || "회사"} 기준으로 본 ${doc.title}`}
        subtitle={shown ? `${formatDate(shown.at)} 채점${changedSince ? ", 이후 서류를 고쳤어요" : ""}` : undefined}
        actions={
          !agent.busy && (
            <>
              {shown && (
                <Button variant="secondary" onClick={() => revise(shown)}>
                  피드백 반영해 수정본 만들기
                </Button>
              )}
              <Button onClick={evaluate}>{evals.length ? "다시 채점받기" : "채점받기"}</Button>
            </>
          )
        }
      >
        <div className="space-y-3">
          <AgentStatus {...agent} onStop={agent.stop} />
          {!app.companyProfile && !agent.busy && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              회사 프로필이 없어서 일반적인 기준으로 평가해요. 정확한 평가를 원하면{" "}
              <button className="font-medium underline" onClick={() => goTab("research")}>회사 리서치</button>를 먼저 해 주세요.
            </p>
          )}
          {agent.busy ? (
            streaming ? <Markdown>{streaming}</Markdown> : null
          ) : shown ? (
            <div className="review-marks relative">
              {shown.score != null && (
                <div className="float-right mb-2 ml-4 mt-1">
                  <ScoreStamp key={shown.id} score={shown.score} size={92} animate={shown.id === evals[evals.length - 1]?.id && Date.now() - shown.at < 8000} />
                </div>
              )}
              <Markdown>{shown.content}</Markdown>
            </div>
          ) : (
            <Empty icon={<ClipboardCheck />} title="아직 채점하지 않았어요" action={<Button onClick={evaluate}>채점받기</Button>}>
              회사 프로필의 평가 기준과 직무 요건으로 실제 서류 심사처럼 채점해요. 고칠 문장은 원문과 수정안을 나란히 보여드려요.
            </Empty>
          )}
        </div>
      </Card>
    </div>
  );
}

function DocRow({ doc, active, onClick }: { doc: Doc; active: boolean; onClick: () => void }) {
  const last = doc.evaluations[doc.evaluations.length - 1];
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${active ? "bg-brand-50 font-semibold text-brand-900 dark:bg-brand-950 dark:text-brand-100" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}
    >
      <span className="truncate">{doc.title}</span>
      {last ? <Badge tone={scoreTone(last.score)}>{last.score ?? "-"}점</Badge> : <span className="text-xs text-slate-400">채점 전</span>}
    </button>
  );
}

function ScoreTrend({ evals, activeId, onPick }: { evals: Evaluation[]; activeId?: string; onPick: (id: string) => void }) {
  const H = 96;
  return (
    <div className="relative pt-4">
      {/* 합격권 기준선 (80점) */}
      <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-pass/60" style={{ bottom: (80 / 100) * H + 18 }} aria-hidden>
        <span className="absolute -top-4 right-0 text-[10px] font-semibold text-pass">합격권 80</span>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: H + 18 }}>
        {evals.map((e, i) => (
          <button
            key={e.id}
            onClick={() => onPick(e.id)}
            title={`${i + 1}회차 ${e.score ?? "-"}점 (${formatDate(e.at)})`}
            aria-label={`${i + 1}회차 ${e.score ?? "-"}점`}
            className="group flex flex-1 flex-col items-center justify-end gap-1"
          >
            <span className={`text-[10px] tabular-nums ${e.id === activeId ? "font-bold text-brand-900 dark:text-white" : "text-slate-500"}`}>{e.score ?? "-"}</span>
            <span
              className={`w-full max-w-8 rounded-t transition ${e.id === activeId ? ((e.score ?? 0) >= 80 ? "bg-pass" : "bg-pen") : "bg-slate-300 group-hover:bg-slate-400 dark:bg-slate-700"}`}
              style={{ height: Math.max(4, ((e.score ?? 0) / 100) * H) }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
