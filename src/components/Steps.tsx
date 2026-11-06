"use client";
import { useEffect, useRef, useState } from "react";
import type { AgentContext } from "@/lib/agents";
import { runAgent } from "@/lib/runAgent";
import type { Application } from "@/lib/store";
import { Markdown } from "./Markdown";
import { Button, Card, Empty, Field, Spinner, inputCls } from "./ui";

interface StepProps {
  app: Application;
  update: (patch: Partial<Application>) => void;
  ctx: AgentContext;
  myExperience: string;
  setExperience: (v: string) => void;
}

function useRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function ErrorText({ error }: { error: string }) {
  return error ? <p className="text-sm text-red-600">{error}</p> : null;
}

/* 1. 회사 리서치 */
export function ResearchStep({ app, update, ctx }: StepProps) {
  const { busy, error, run } = useRunner();
  const start = () =>
    run(() =>
      runAgent(
        "research",
        { company: app.company, role: app.role, jobPosting: app.jobPosting },
        { instruction: `${app.company}${app.role ? ` ${app.role} 직무` : ""}에 대해 조사해서 회사 프로필을 만들어 주세요.` },
        (t) => update({ companyProfile: t }),
      ),
    );
  void ctx;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="지원 정보">
        <div className="space-y-4">
          <Field label="회사 이름">
            <input className={inputCls} value={app.company} placeholder="예: 토스" onChange={(e) => update({ company: e.target.value })} />
          </Field>
          <Field label="지원 직무">
            <input className={inputCls} value={app.role} placeholder="예: 프론트엔드 개발자" onChange={(e) => update({ role: e.target.value })} />
          </Field>
          <Field label="채용공고 (선택)" hint="공고 내용을 붙여넣으면 직무 요건이 더 정확해져요.">
            <textarea className={`${inputCls} h-40`} value={app.jobPosting} onChange={(e) => update({ jobPosting: e.target.value })} />
          </Field>
          <Button onClick={start} disabled={busy || !app.company.trim()} className="w-full">
            {busy ? <><Spinner /> 웹에서 조사하는 중…</> : app.companyProfile ? "다시 조사하기" : "회사 조사 시작"}
          </Button>
          <ErrorText error={error} />
        </div>
      </Card>
      <Card title="회사 프로필">
        {app.companyProfile ? (
          <Markdown>{app.companyProfile}</Markdown>
        ) : (
          <Empty>회사 이름을 넣고 조사를 시작하면, 인재상과 평가 기준이 담긴 회사 프로필이 여기에 정리돼요. 다음 단계의 모든 에이전트가 이 프로필을 함께 써요.</Empty>
        )}
      </Card>
    </div>
  );
}

/* 2. 서류 작성 */
const DOC_TYPES = ["자기소개서", "이력서", "포트폴리오 구성안"];
export function WriterStep({ app, update, ctx, myExperience, setExperience }: StepProps) {
  const { busy, error, run } = useRunner();
  const start = () =>
    run(() =>
      runAgent(
        "writer",
        ctx,
        { instruction: `${app.company}에 제출할 ${app.docType}를 작성해 주세요.${app.docRequest ? `\n요청 사항:\n${app.docRequest}` : ""}` },
        (t) => update({ document: t }),
      ),
    );
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="재료">
        <div className="space-y-4">
          <Field label="내 경험 (모든 지원 건에 공통으로 쓰여요)" hint="학력, 경력, 프로젝트, 수치로 된 성과, 기술 스택을 자유롭게 적어 주세요. 기존 이력서를 붙여넣어도 돼요.">
            <textarea className={`${inputCls} h-48`} value={myExperience} onChange={(e) => setExperience(e.target.value)} />
          </Field>
          <Field label="서류 종류">
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => update({ docType: t })}
                  className={`rounded-full border px-3 py-1 text-sm transition ${app.docType === t ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <Field label="자소서 문항, 글자 수 등 요청 사항" hint="예: 1. 지원 동기 (700자) 2. 협업 경험 (500자)">
            <textarea className={`${inputCls} h-28`} value={app.docRequest} onChange={(e) => update({ docRequest: e.target.value })} />
          </Field>
          {!app.companyProfile && <p className="text-xs text-amber-600">회사 리서치를 먼저 하면 회사에 더 잘 맞춘 서류가 나와요.</p>}
          <Button onClick={start} disabled={busy || !myExperience.trim()} className="w-full">
            {busy ? <><Spinner /> 작성하는 중…</> : app.document ? "다시 작성하기" : "서류 작성"}
          </Button>
          <ErrorText error={error} />
        </div>
      </Card>
      <Card
        title="서류"
        actions={app.document && <span className="text-xs text-zinc-500">직접 고쳐도 돼요 · {app.document.length}자</span>}
      >
        {app.document || busy ? (
          busy ? <Markdown>{app.document}</Markdown> : (
            <textarea className={`${inputCls} h-[32rem] font-mono text-[13px] leading-relaxed`} value={app.document} onChange={(e) => update({ document: e.target.value })} />
          )
        ) : (
          <Empty>내 경험을 적고 작성을 누르면 회사 프로필에 맞춘 서류 초안이 나와요. 이미 쓴 서류가 있다면 여기에 붙여넣고 바로 평가로 넘어가도 돼요.
            <div className="mt-3"><Button variant="ghost" onClick={() => update({ document: " " })}>직접 붙여넣기</Button></div>
          </Empty>
        )}
      </Card>
    </div>
  );
}

/* 3. 평가 */
export function EvaluatorStep({ app, update, ctx }: StepProps) {
  const { busy, error, run } = useRunner();
  const start = () =>
    run(() =>
      runAgent("evaluator", ctx, { instruction: `${app.company} 평가 기준으로 이 ${app.docType}를 평가해 주세요.` }, (t) =>
        update({ evaluation: t }),
      ),
    );
  return (
    <div className="space-y-5">
      <Card
        title={`${app.company || "회사"} 기준 평가`}
        actions={
          <Button onClick={start} disabled={busy || !app.document.trim()}>
            {busy ? <><Spinner /> 평가하는 중…</> : app.evaluation ? "다시 평가" : "평가 받기"}
          </Button>
        }
      >
        <ErrorText error={error} />
        {app.evaluation ? (
          <Markdown>{app.evaluation}</Markdown>
        ) : (
          <Empty>{app.document.trim() ? "평가 받기를 누르면 회사의 인재상과 직무 요건을 기준으로 점수와 개선점을 알려드려요." : "먼저 2단계에서 서류를 작성하거나 붙여넣어 주세요."}</Empty>
        )}
      </Card>
    </div>
  );
}

/* 4. 모의 면접 */
const MODES = ["직무 + 인성 종합 면접", "직무 기술 면접", "인성 면접", "임원 면접"];
export function InterviewStep({ app, update, ctx }: StepProps) {
  const { busy, error, run } = useRunner();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const msgs = app.interview;
  const ended = msgs.some((m) => m.role === "user" && m.content === "[면접 종료]");

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [msgs]);

  const send = (history: typeof msgs) =>
    run(async () => {
      update({ interview: [...history, { role: "assistant", content: "" }] });
      await runAgent("interviewer", { ...ctx, interviewMode: app.interviewMode }, { messages: history }, (t) =>
        update({ interview: [...history, { role: "assistant", content: t }] }),
      );
    });

  const begin = () => send([{ role: "user", content: "안녕하세요, 면접 보러 왔습니다." }]);
  const answer = () => {
    if (!input.trim()) return;
    const h = [...msgs, { role: "user" as const, content: input.trim() }];
    setInput("");
    send(h);
  };
  const finish = () => send([...msgs, { role: "user", content: "[면접 종료]" }]);

  return (
    <Card
      title="모의 면접"
      actions={
        msgs.length > 0 && (
          <div className="flex gap-2">
            {!ended && <Button variant="ghost" onClick={finish} disabled={busy}>면접 종료하고 피드백 받기</Button>}
            <Button variant="ghost" onClick={() => update({ interview: [] })} disabled={busy}>새로 시작</Button>
          </div>
        )
      }
    >
      {msgs.length === 0 ? (
        <div className="space-y-4">
          <Field label="면접 유형">
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ interviewMode: m })}
                  className={`rounded-full border px-3 py-1 text-sm transition ${app.interviewMode === m ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </Field>
          <Empty>
            면접관이 회사 프로필과 내 서류를 읽고 질문해요. 한 질문씩 답하면 꼬리질문이 이어지고, 끝나면 질문별 피드백을 받을 수 있어요.
            <div className="mt-3"><Button onClick={begin} disabled={busy}>{busy ? <Spinner /> : "면접 시작"}</Button></div>
          </Empty>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {msgs.slice(1).map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="flex gap-3">
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">면접관</div>
                  <div className="rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                    {m.content ? <Markdown>{m.content}</Markdown> : <Spinner />}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-3 text-sm text-white">
                    {m.content === "[면접 종료]" ? "면접을 마치고 피드백을 요청했어요." : m.content}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>
          {!ended && (
            <div className="flex gap-2">
              <textarea
                className={`${inputCls} h-24 flex-1`}
                placeholder="답변을 입력하세요 (Ctrl+Enter로 전송)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) answer();
                }}
              />
              <Button onClick={answer} disabled={busy || !input.trim()} className="self-end">답변</Button>
            </div>
          )}
        </div>
      )}
      <ErrorText error={error} />
    </Card>
  );
}
