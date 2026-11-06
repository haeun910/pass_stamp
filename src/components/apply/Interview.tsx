"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { AgentStatus, Badge, Button, Card, Chips, CopyButton, Empty, Field, inputCls, scoreTone } from "@/components/ui";
import { baseContext, settingsText, submittedDocs, useAgent } from "@/lib/client";
import { useStore } from "@/lib/store";
import { formatDate, parseScore, stripMarkdown } from "@/lib/text";
import { ChatMessage, InterviewSession, InterviewSettings, defaultInterviewSettings, uid } from "@/lib/types";
import { PanelProps } from "./shared";

const MODES = ["직무 + 인성 종합", "직무 기술", "인성·조직 적합성", "임원"] as const;
const COUNTS = [5, 7, 10] as const;
const DIFFS = ["기본", "심화", "압박"] as const;
const TIMES = [0, 60, 90, 120] as const;
const OPENING = "안녕하세요, 오늘 면접 보러 온 지원자입니다.";
const TIMEOUT_TEXT = "(시간 초과로 답변하지 못함)";
const END_TEXT = "[면접 종료]";

export function InterviewPanel(props: PanelProps) {
  const [view, setView] = useState<"practice" | "questions">("practice");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 sm:w-fit dark:bg-zinc-800/60">
        {(
          [
            ["practice", "모의 면접"],
            ["questions", "예상 질문"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            className={`flex-1 rounded-lg px-4 py-1.5 text-sm transition sm:flex-none ${view === k ? "bg-white font-medium shadow-sm dark:bg-zinc-900" : "text-zinc-600 dark:text-zinc-400"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div hidden={view !== "practice"}>
        <Practice {...props} />
      </div>
      <div hidden={view !== "questions"}>
        <QuestionBank {...props} />
      </div>
    </div>
  );
}

/* ───────────── 예상 질문 ───────────── */

function QuestionBank({ app, profile, goTab }: PanelProps) {
  const { updateApp } = useStore();
  const agent = useAgent();
  const run = async () => {
    const prev = app.questionBank;
    const res = await agent.run(
      "questions",
      { ...baseContext(app, profile), otherDocs: submittedDocs(app) },
      { instruction: `${app.company || "지원 회사"} ${app.role} 면접의 예상 질문과 답변 전략을 정리해 주세요.` },
      (t) => updateApp(app.id, { questionBank: t }),
    );
    if (!res.text.trim()) updateApp(app.id, { questionBank: prev });
  };
  return (
    <Card
      title="예상 질문과 답변 전략"
      subtitle="회사 프로필, 내 프로필, 제출 서류를 근거로 실제로 나올 질문을 뽑아요."
      actions={
        !agent.busy && (
          <>
            {app.questionBank && <CopyButton text={app.questionBank} />}
            <Button onClick={run}>{app.questionBank ? "다시 뽑기" : "예상 질문 뽑기"}</Button>
          </>
        )
      }
    >
      <div className="space-y-3">
        <AgentStatus {...agent} onStop={agent.stop} />
        {app.questionBank ? (
          <Markdown>{app.questionBank}</Markdown>
        ) : (
          !agent.busy && (
            <Empty icon="💡">
              꼭 나올 질문, 서류 검증 질문, 직무 질문, 압박 질문까지 20개 남짓을 질문 의도와 답변 재료와 함께 정리해 드려요.
              {!app.docs.some((d) => d.content.trim()) && (
                <span className="mt-2 block text-amber-600">
                  서류를 먼저 쓰면 서류 내용을 파고드는 질문까지 뽑을 수 있어요.{" "}
                  <button className="underline" onClick={() => goTab("docs")}>서류 쓰러 가기</button>
                </span>
              )}
            </Empty>
          )
        )}
      </div>
    </Card>
  );
}

/* ───────────── 모의 면접 ───────────── */

function Practice({ app, profile, goTab }: PanelProps) {
  const { updateApp, updateInterview } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<InterviewSettings>(defaultInterviewSettings);
  const session = app.interviews.find((s) => s.id === activeId) ?? null;

  const start = () => {
    const s: InterviewSession = {
      id: uid(),
      settings,
      messages: [{ role: "user", content: OPENING, at: Date.now() }],
      report: "",
      score: null,
      startedAt: Date.now(),
      endedAt: null,
    };
    updateApp(app.id, (a) => ({ interviews: [...a.interviews, s] }));
    setActiveId(s.id);
  };

  if (session) {
    return (
      <Session
        key={session.id}
        app={app}
        profile={profile}
        session={session}
        update={(p) => updateInterview(app.id, session.id, p)}
        onClose={() => setActiveId(null)}
        autoStart={session.messages.length === 1}
      />
    );
  }

  const past = [...app.interviews].reverse();
  const hasDocs = app.docs.some((d) => d.content.trim());

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card title="새 면접 설정">
        <div className="space-y-5">
          <Field label="면접 유형">
            <Chips options={MODES} value={settings.mode as (typeof MODES)[number]} onChange={(v) => setSettings({ ...settings, mode: v })} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="본 질문 수" hint="꼬리질문은 따로 나와요.">
              <Chips options={COUNTS} value={settings.questionCount as (typeof COUNTS)[number]} onChange={(v) => setSettings({ ...settings, questionCount: v })} render={(v) => `${v}개`} />
            </Field>
            <Field label="난이도" hint={settings.difficulty === "압박" ? "반론과 약점 지적이 섞여요." : settings.difficulty === "심화" ? "꼬리질문이 깊어져요." : "실제 1차 면접 수준이에요."}>
              <Chips options={DIFFS} value={settings.difficulty} onChange={(v) => setSettings({ ...settings, difficulty: v })} />
            </Field>
          </div>
          <Field label="답변 제한 시간" hint="시간이 끝나면 쓰던 답변이 자동으로 제출돼요.">
            <Chips options={TIMES} value={settings.answerSeconds as (typeof TIMES)[number]} onChange={(v) => setSettings({ ...settings, answerSeconds: v })} render={(v) => (v ? `${v}초` : "제한 없음")} />
          </Field>
          <VoiceToggle value={settings.voice} onChange={(v) => setSettings({ ...settings, voice: v })} />
          {(!app.companyProfile || !hasDocs) && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              {!app.companyProfile ? "회사 리서치" : "서류"}가 없어서 일반적인 질문 위주로 나와요.{" "}
              <button className="font-medium underline" onClick={() => goTab(!app.companyProfile ? "research" : "docs")}>먼저 준비하기</button>
            </p>
          )}
          <Button className="w-full" onClick={start}>면접 시작</Button>
        </div>
      </Card>

      <Card title={`면접 기록 · ${past.length}`}>
        {past.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 연습한 면접이 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {past.map((s) => {
              const answered = s.messages.filter((m) => m.role === "user" && m.content !== OPENING).length;
              return (
                <li key={s.id}>
                  <button onClick={() => setActiveId(s.id)} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <span className="min-w-0">
                      <span className="block truncate">{s.settings.mode} · {s.settings.difficulty}</span>
                      <span className="text-xs text-zinc-500">{formatDate(s.startedAt)} · 답변 {answered}개</span>
                    </span>
                    {s.report ? <Badge tone={scoreTone(s.score)}>{s.score ?? "-"}점</Badge> : <Badge>진행 중</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Session({
  app,
  profile,
  session,
  update,
  onClose,
  autoStart,
}: {
  app: PanelProps["app"];
  profile: PanelProps["profile"];
  session: InterviewSession;
  update: (p: Partial<InterviewSession> | ((s: InterviewSession) => Partial<InterviewSession>)) => void;
  onClose: () => void;
  autoStart: boolean;
}) {
  const agent = useAgent();
  const report = useAgent();
  const [input, setInput] = useState("");
  const [showTranscript, setShowTranscript] = useState(!session.report);
  const endRef = useRef<HTMLDivElement>(null);
  const shownAt = useRef<number>(Date.now());
  const s = session.settings;
  const msgs = session.messages;
  const last = msgs[msgs.length - 1];
  const finished = !!session.report || report.busy;
  const interviewerDone = last?.role === "assistant" && /면접을\s*마치겠습니다/.test(last.content);
  const waitingAnswer = !agent.busy && !finished && last?.role === "assistant" && !!last.content && !interviewerDone;

  const ctx = useMemo(
    () => ({ ...baseContext(app, profile), otherDocs: submittedDocs(app), interviewSettings: settingsText(s) }),
    [app, profile, s],
  );

  const qNow = useMemo(() => {
    let n = 0;
    for (const m of msgs) if (m.role === "assistant") for (const x of m.content.matchAll(/Q(\d+)[.\-]/g)) n = Math.max(n, Number(x[1]));
    return n;
  }, [msgs]);

  const speech = useSpeech();

  const ask = useCallback(
    async (history: ChatMessage[]) => {
      speech.cancelSpeak();
      const at = Date.now();
      update({ messages: [...history, { role: "assistant", content: "", at }] });
      const res = await agent.run("interviewer", ctx, { messages: history }, (t) =>
        update({ messages: [...history, { role: "assistant", content: t, at }] }),
      );
      if (!res.text.trim()) update({ messages: history }); // 실패하면 다시 시도할 수 있게 되돌려요
      else if (s.voice) speech.speak(stripMarkdown(res.text));
    },
    [agent, ctx, s.voice, speech, update],
  );

  useEffect(() => {
    if (autoStart) ask(msgs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 새 질문이 화면에 다 나오면 답변 시간을 재기 시작해요.
  useEffect(() => {
    if (waitingAnswer) shownAt.current = Date.now();
  }, [waitingAnswer, msgs.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs.length, last?.content.length, report.busy]);

  const submit = useCallback(
    (text: string) => {
      if (speech.listening) speech.stopListen();
      const seconds = Math.round((Date.now() - shownAt.current) / 1000);
      const h: ChatMessage[] = [...msgs, { role: "user", content: text, at: Date.now(), seconds }];
      setInput("");
      ask(h);
    },
    [ask, msgs, speech],
  );

  const remaining = useCountdown(waitingAnswer && s.answerSeconds > 0, s.answerSeconds, msgs.length);
  const inputRef = useRef(input);
  inputRef.current = input;
  const autoSubmitted = useRef(-1);
  useEffect(() => {
    if (remaining === 0 && waitingAnswer && autoSubmitted.current !== msgs.length) {
      autoSubmitted.current = msgs.length;
      submit(inputRef.current.trim() || TIMEOUT_TEXT);
    }
  }, [remaining, waitingAnswer, submit, msgs.length]);

  // 음성 인식 결과를 답변 칸에 이어 붙여요.
  useEffect(() => {
    speech.onFinal.current = (t: string) => setInput((v) => (v ? `${v} ${t}` : t));
  }, [speech.onFinal]);

  const finish = async () => {
    speech.cancelSpeak();
    if (speech.listening) speech.stopListen();
    setShowTranscript(false);
    const history: ChatMessage[] = [...msgs, { role: "user", content: END_TEXT }];
    const res = await report.run("interviewer", ctx, { messages: history }, (t) => update({ report: t }));
    if (res.ok) update({ report: res.text, score: parseScore(res.text), endedAt: Date.now() });
    else update({ report: "" });
  };

  const answeredCount = msgs.filter((m) => m.role === "user" && m.content !== OPENING).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { speech.cancelSpeak(); agent.stop(); onClose(); }}>← 면접 목록</Button>
          <Badge tone="indigo">{s.mode}</Badge>
          <Badge>{s.difficulty}</Badge>
          {!finished && <span className="text-sm text-zinc-500">질문 {Math.min(qNow, s.questionCount)} / {s.questionCount}</span>}
        </div>
        {!finished && answeredCount > 0 && (
          <Button variant={interviewerDone ? "primary" : "secondary"} onClick={finish} disabled={agent.busy}>
            면접 종료하고 피드백 받기
          </Button>
        )}
      </div>

      {session.report || report.busy ? (
        <Card
          title="면접 피드백"
          subtitle={session.endedAt ? formatDate(session.endedAt) : undefined}
          actions={session.report && !report.busy && <CopyButton text={session.report} />}
        >
          <div className="space-y-3">
            <AgentStatus {...report} onStop={report.stop} />
            {session.report && <Markdown>{session.report}</Markdown>}
          </div>
        </Card>
      ) : null}
      {!report.busy && report.error && !session.report && (
        <Card>
          <AgentStatus {...report} onStop={report.stop} />
          <Button className="mt-3" onClick={finish}>피드백 다시 받기</Button>
        </Card>
      )}

      <Card
        title="면접 기록"
        actions={finished && <Button variant="ghost" size="sm" onClick={() => setShowTranscript((v) => !v)}>{showTranscript ? "접기" : "펼치기"}</Button>}
      >
        {showTranscript || !finished ? (
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              {msgs.slice(1).map((m, i) =>
                m.role === "assistant" ? (
                  <div key={i} className="flex gap-3">
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">면접관</div>
                    <div className="min-w-0 rounded-2xl rounded-tl-sm bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
                      {m.content ? <Markdown>{m.content}</Markdown> : <span className="text-sm text-zinc-500">{agent.status || "질문 준비 중"}…</span>}
                      {m.content && s.voice && !agent.busy && (
                        <button className="mt-1 text-xs text-zinc-500 hover:text-indigo-600" onClick={() => speech.speak(stripMarkdown(m.content))}>다시 듣기</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex flex-col items-end gap-1">
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm px-4 py-3 text-sm ${m.content === TIMEOUT_TEXT ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-700" : "bg-indigo-600 text-white"}`}>
                      {m.content}
                    </div>
                    {m.seconds != null && <span className="text-[11px] text-zinc-400">{m.seconds}초 · {m.content.length}자</span>}
                  </div>
                ),
              )}
              <div ref={endRef} />
            </div>

            {!agent.busy && agent.error && (
              <div className="space-y-2">
                <AgentStatus {...agent} onStop={agent.stop} />
                {last?.role === "user" && <Button size="sm" onClick={() => ask(msgs)}>다시 시도</Button>}
              </div>
            )}

            {interviewerDone && !finished && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                면접관이 면접을 마쳤어요. 위의 &quot;면접 종료하고 피드백 받기&quot;를 눌러 질문별 피드백을 받아 보세요.
              </p>
            )}

            {!finished && !interviewerDone && (
              <div className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                {s.answerSeconds > 0 && waitingAnswer && remaining != null && (
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-linear ${remaining <= 10 ? "bg-red-500" : "bg-indigo-500"}`}
                        style={{ width: `${(remaining / s.answerSeconds) * 100}%` }}
                      />
                    </div>
                    <span className={`tabular-nums ${remaining <= 10 ? "font-semibold text-red-600" : ""}`}>{remaining}초</span>
                  </div>
                )}
                <textarea
                  className={`${inputCls} h-28 leading-relaxed`}
                  placeholder={waitingAnswer ? (s.voice && speech.supported ? "마이크 버튼을 누르고 말하거나, 직접 입력하세요" : "답변을 입력하세요 · Ctrl+Enter로 제출") : "면접관이 질문하는 중이에요"}
                  value={input + (speech.interim ? (input ? " " : "") + speech.interim : "")}
                  disabled={!waitingAnswer}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && input.trim()) submit(input.trim());
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {s.voice && speech.supported && (
                      <Button
                        variant={speech.listening ? "danger" : "secondary"}
                        size="sm"
                        disabled={!waitingAnswer}
                        onClick={() => (speech.listening ? speech.stopListen() : speech.listen())}
                        className={speech.listening ? "border border-red-300" : ""}
                      >
                        {speech.listening ? "● 듣는 중 (누르면 멈춤)" : "🎤 말로 답하기"}
                      </Button>
                    )}
                    <span className="text-xs text-zinc-400">{input.length}자</span>
                  </div>
                  <Button onClick={() => submit(input.trim())} disabled={!waitingAnswer || !input.trim()}>답변 제출</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">질문과 답변 {msgs.length - 1}개</p>
        )}
      </Card>
    </div>
  );
}

function VoiceToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const [supported, setSupported] = useState(true);
  useEffect(() => setSupported(speechSupported()), []);
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="text-sm">
        <span className="font-medium">음성 면접</span>
        <span className="block text-xs text-zinc-500">
          면접관 질문을 소리로 읽어 주고, 마이크로 답할 수 있어요.
          {!supported && " 이 브라우저는 음성 인식을 지원하지 않아 읽어주기만 돼요. 크롬이나 엣지를 권장해요."}
        </span>
      </span>
    </label>
  );
}

/* ───────────── 훅 ───────────── */

function useCountdown(active: boolean, seconds: number, resetKey: number): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setLeft(null);
      return;
    }
    const start = Date.now();
    setLeft(seconds);
    const t = setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - start) / 1000));
      setLeft(l);
      if (l === 0) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [active, seconds, resetKey]);
  return left;
}

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function speechSupported() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function useSpeech() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const onFinal = useRef<(t: string) => void>(() => {});

  useEffect(() => {
    setSupported(speechSupported());
    return () => {
      rec.current?.stop();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const listen = useCallback(() => {
    const w = window as unknown as Record<string, new () => Recognition>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    const r = new Ctor();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let temp = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onFinal.current(res[0].transcript.trim());
        else temp += res[0].transcript;
      }
      setInterim(temp);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  const stopListen = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 1200));
    u.lang = "ko-KR";
    u.rate = 1.05;
    const ko = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ko"));
    if (ko) u.voice = ko;
    window.speechSynthesis.speak(u);
  }, []);

  const cancelSpeak = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  return useMemo(
    () => ({ supported, listening, interim, listen, stopListen, speak, cancelSpeak, onFinal }),
    [supported, listening, interim, listen, stopListen, speak, cancelSpeak],
  );
}
