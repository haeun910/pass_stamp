"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentContext, AgentId } from "./agents";
import type { Application, ChatMessage, Doc, InterviewSettings, Profile } from "./types";
import { profileToText } from "./types";

const CODE_KEY = "online-interviewer:access-code";

export function getAccessCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}
export function setAccessCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {}
}

export function authHeaders(): Record<string, string> {
  const code = getAccessCode();
  return code ? { "x-access-code": code } : {};
}

export function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function docQuestionsText(doc: Doc): string {
  return doc.questions
    .filter((q) => q.question.trim())
    .map((q, i) => `${i + 1}. ${q.question.trim()}${q.limit ? ` (${q.limit}자 이내, 공백 포함)` : ""}`)
    .join("\n");
}

/** 지원 건과 프로필에서 에이전트가 쓸 참고 자료를 모아요. */
export function baseContext(app: Application, profile: Profile): AgentContext {
  return {
    today: todayString(),
    company: app.company,
    role: app.role,
    jobUrl: app.jobUrl,
    jobPosting: app.jobPosting,
    companyProfile: app.companyProfile,
    profile: profileToText(profile),
  };
}

export function docContext(app: Application, profile: Profile, doc: Doc): AgentContext {
  return {
    ...baseContext(app, profile),
    docType: doc.type,
    docQuestions: doc.type === "자기소개서" ? docQuestionsText(doc) : "",
    docRequest: doc.request,
    document: doc.content,
  };
}

export function submittedDocs(app: Application): string {
  return app.docs
    .filter((d) => d.content.trim())
    .map((d) => `## [${d.type}] ${d.title}\n${d.content.split(/^---\s*$/m)[0].trim()}`)
    .join("\n\n");
}

export function settingsText(s: InterviewSettings): string {
  return `면접 유형: ${s.mode}\n본 질문 수: ${s.questionCount}개\n난이도: ${s.difficulty}${s.answerSeconds ? `\n답변 제한 시간: ${s.answerSeconds}초` : ""}`;
}

type Ev = { type: "status" | "text" | "notice" | "error"; text: string };

/** 에이전트를 스트리밍으로 부르고, 진행 상태와 중지를 관리해요. */
export function useAgent() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const run = useCallback(
    async (
      agent: AgentId,
      context: AgentContext,
      opts: { instruction?: string; messages?: ChatMessage[] },
      onText: (full: string) => void,
    ): Promise<{ text: string; ok: boolean }> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setBusy(true);
      setError("");
      setNotice("");
      setStatus("연결하는 중");
      let full = "";
      let ok = true;
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            agent,
            context,
            instruction: opts.instruction,
            messages: opts.messages?.map(({ role, content }) => ({ role, content })),
          }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `요청에 실패했어요 (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            let ev: Ev;
            try {
              ev = JSON.parse(line);
            } catch {
              continue;
            }
            if (ev.type === "text") {
              full += ev.text;
              onText(full);
            } else if (ev.type === "status") setStatus(ev.text);
            else if (ev.type === "notice") setNotice(ev.text);
            else if (ev.type === "error") {
              ok = false;
              setError(ev.text);
            }
          }
        }
      } catch (e) {
        if (ac.signal.aborted) {
          setNotice("생성을 중지했어요. 여기까지 작성된 내용은 저장돼요.");
          ok = full.length > 0;
        } else {
          ok = false;
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (abortRef.current === ac) abortRef.current = null;
        setBusy(false);
        setStatus("");
      }
      return { text: full, ok: ok && full.trim().length > 0 };
    },
    [],
  );

  return { run, stop, busy, status, error, notice, setError };
}

export interface Health {
  hasKey: boolean;
  mock: boolean;
  needsCode: boolean;
  codeOk: boolean;
}

export function useHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/health", { headers: authHeaders(), cache: "no-store" });
      setHealth(await r.json());
    } catch {
      setHealth(null);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { health, refresh };
}
