"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { AgentStatus, Badge, Button, Card, CopyButton, Empty, Field, inputCls, scoreTone } from "@/components/ui";
import { docContext, useAgent } from "@/lib/client";
import { useStore } from "@/lib/store";
import { countChars, downloadText, relativeTime, splitAnswers, stripMarkdown } from "@/lib/text";
import { DOC_TYPES, Doc, DocType, uid } from "@/lib/types";
import { DiffView } from "./DiffView";
import { PanelProps, latestVersionId, splitMemo, withSnapshot } from "./shared";

const TYPE_DESC: Record<DocType, string> = {
  자기소개서: "문항별 답변, 글자 수 제한 자동 확인",
  이력서: "핵심 역량과 성과 중심 1~2쪽",
  경력기술서: "프로젝트별 역할과 성과 상세",
  포트폴리오: "회사 맞춤 프로젝트 선정과 구성안",
};

export interface PendingRevision {
  docId: string;
  evaluation: string;
}

export function DocsPanel({
  app,
  profile,
  goTab,
  docId,
  setDocId,
  pending,
  clearPending,
}: PanelProps & { docId: string | null; setDocId: (id: string) => void; pending: PendingRevision | null; clearPending: () => void }) {
  const { addDoc, deleteDoc } = useStore();
  const doc = app.docs.find((d) => d.id === docId) ?? app.docs[0] ?? null;

  const add = (t: DocType) => setDocId(addDoc(app.id, t));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {app.docs.map((d) => {
          const lastEv = d.evaluations[d.evaluations.length - 1];
          const score = lastEv?.score;
          const stale = lastEv && lastEv.versionId !== latestVersionId(d);
          return (
            <button
              key={d.id}
              onClick={() => setDocId(d.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${doc?.id === d.id ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"}`}
            >
              {d.title}
              {score != null && <Badge tone={stale ? "zinc" : scoreTone(score)}>{score}{stale ? " · 수정 전" : ""}</Badge>}
            </button>
          );
        })}
        <AddDocMenu onAdd={add} compact={app.docs.length > 0} />
      </div>

      {!doc ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOC_TYPES.map((t) => (
            <button key={t} onClick={() => add(t)} className="rounded-2xl border border-zinc-200 bg-white p-5 text-left transition hover:border-indigo-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-zinc-500">{TYPE_DESC[t]}</p>
              <p className="mt-3 text-sm font-medium text-indigo-600">+ 만들기</p>
            </button>
          ))}
        </div>
      ) : (
        <DocEditor
          key={doc.id}
          app={app}
          profile={profile}
          doc={doc}
          goTab={goTab}
          pending={pending?.docId === doc.id ? pending : null}
          clearPending={clearPending}
          onDelete={() => {
            if (confirm(`"${doc.title}"을(를) 삭제할까요? 버전과 평가 기록도 함께 지워져요.`)) deleteDoc(app.id, doc.id);
          }}
        />
      )}
    </div>
  );
}

function AddDocMenu({ onAdd, compact }: { onAdd: (t: DocType) => void; compact: boolean }) {
  const [open, setOpen] = useState(false);
  if (!compact) return null;
  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>+ 서류 추가</Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {DOC_TYPES.map((t) => (
              <button key={t} onClick={() => { onAdd(t); setOpen(false); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                {t}
                <span className="block text-xs text-zinc-500">{TYPE_DESC[t]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DocEditor({
  app,
  profile,
  doc,
  goTab,
  onDelete,
  pending,
  clearPending,
}: PanelProps & { doc: Doc; onDelete: () => void; pending: PendingRevision | null; clearPending: () => void }) {
  const { updateDoc } = useStore();
  const agent = useAgent();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [revision, setRevision] = useState("");
  const [showVersions, setShowVersions] = useState(false);
  const [compare, setCompare] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const update = (patch: Partial<Doc> | ((d: Doc) => Partial<Doc>)) => updateDoc(app.id, doc.id, patch);

  const { body, memo } = splitMemo(doc.content);
  const isCover = doc.type === "자기소개서";
  const lastEval = doc.evaluations[doc.evaluations.length - 1];
  const hasProfile = Object.values(profile).some((v) => v.trim());

  const generate = async (kind: "write" | "revise", request?: string, evaluation?: string) => {
    // 생성 전에 지금 내용을 버전으로 남겨서 언제든 되돌릴 수 있게 해요.
    update((d) => withSnapshot(d, "직접 수정"));
    setMode("preview");
    setCompare(false);
    if (window.innerWidth < 1280) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const ctx = {
      ...docContext(app, profile, doc),
      ...(kind === "revise" ? { revisionRequest: request, evaluation } : {}),
    };
    const instruction =
      kind === "write"
        ? `${app.company || "지원 회사"} ${app.role} 직무에 제출할 ${doc.type}를 작성해 주세요.`
        : `현재 서류를 수정 요청에 맞게 고쳐 주세요.`;
    const res = await agent.run(kind === "write" ? "writer" : "reviser", ctx, { instruction }, (t) => update({ content: t }));
    if (res.text.trim()) {
      const note = kind === "write" ? (doc.versions.length ? "다시 쓰기" : "초안") : evaluation ? "평가 반영" : `수정: ${request?.slice(0, 30)}`;
      update((d) => withSnapshot({ ...d, content: res.text }, note));
    }
    if (kind === "revise") setRevision("");
  };

  // 평가 화면에서 "피드백 반영해 수정본 만들기"를 누르면 여기서 이어서 처리해요.
  useEffect(() => {
    if (!pending || agent.busy) return;
    clearPending();
    generate("revise", "평가 결과의 '꼭 고칠 부분'과 약점을 모두 반영해 주세요.", pending.evaluation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const prevVersion = [...doc.versions].reverse().find((v) => v.content !== doc.content && v.content.trim());
  const fileBase = `${app.company || "회사"}_${doc.title}`.replace(/[\\/:*?"<>|\s]+/g, "_");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* 왼쪽: 작성 설정 (좁은 화면에서는 결과 아래로) */}
      <div className={`space-y-5 ${doc.content.trim() || agent.busy ? "order-2 xl:order-none" : ""}`}>
        <Card
          title="작성 설정"
          actions={<Button variant="danger" size="sm" onClick={onDelete}>삭제</Button>}
        >
          <div className="space-y-4">
            <Field label="서류 이름">
              <input className={inputCls} value={doc.title} onChange={(e) => update({ title: e.target.value })} />
            </Field>

            {isCover && <QuestionsEditor doc={doc} update={update} />}

            <Field label="추가 요청 (선택)" hint="예: 2번 문항은 동아리 회장 경험으로 써 주세요. / 신입 지원이라 인턴 경험을 강조해 주세요.">
              <textarea className={`${inputCls} h-20`} value={doc.request} onChange={(e) => update({ request: e.target.value })} />
            </Field>

            {!hasProfile && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                프로필이 비어 있어서 내용이 대부분 빈칸으로 나와요. <Link href="/profile" className="font-medium underline">내 프로필</Link>부터 채워 주세요.
              </p>
            )}
            {!app.companyProfile && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                회사 리서치를 먼저 하면 인재상과 평가 기준에 맞춘 서류가 나와요.{" "}
                <button className="font-medium underline" onClick={() => goTab("research")}>리서치하러 가기</button>
              </p>
            )}

            <Button className="w-full" onClick={() => generate("write")} disabled={agent.busy || (isCover && !doc.questions.some((q) => q.question.trim()))}>
              {doc.content.trim() ? "처음부터 다시 쓰기" : `${doc.type} 쓰기`}
            </Button>
          </div>
        </Card>

        {isCover && body.trim() && <CharCountTable doc={doc} body={body} />}

        {doc.versions.length > 0 && (
          <Card
            title={`버전 기록 · ${doc.versions.length}`}
            actions={<Button variant="ghost" size="sm" onClick={() => setShowVersions((s) => !s)}>{showVersions ? "접기" : "펼치기"}</Button>}
          >
            {showVersions ? (
              <ul className="space-y-1.5">
                {[...doc.versions].reverse().map((v, i) => {
                  const ev = doc.evaluations.filter((e) => e.versionId === v.id).pop();
                  const current = v.content === doc.content;
                  return (
                    <li key={v.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                      <span className="min-w-0 truncate">
                        <span className="text-zinc-400">v{doc.versions.length - i}</span> {v.note}
                        <span className="ml-2 text-xs text-zinc-500">{relativeTime(v.at)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {ev?.score != null && <Badge tone={scoreTone(ev.score)}>{ev.score}점</Badge>}
                        {current ? (
                          <Badge tone="indigo">현재</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={agent.busy}
                            onClick={() => update((d) => ({ ...withSnapshot(d, "직접 수정"), content: v.content }))}
                          >
                            되돌리기
                          </Button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">마지막 저장: {doc.versions[doc.versions.length - 1].note} · {relativeTime(doc.versions[doc.versions.length - 1].at)}</p>
            )}
          </Card>
        )}
      </div>

      {/* 오른쪽: 결과 */}
      <div ref={resultRef} className={`scroll-mt-20 space-y-5 ${doc.content.trim() || agent.busy ? "order-1 xl:order-none" : ""}`}>
        <Card
          title={doc.title}
          subtitle={doc.content.trim() ? `공백 포함 ${countChars(stripMarkdown(body)).withSpaces.toLocaleString()}자` : undefined}
          actions={
            doc.content.trim() && !agent.busy ? (
              <>
                <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
                  {(["preview", "edit"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        if (m === "preview") update((d) => withSnapshot(d, "직접 수정"));
                        setMode(m);
                      }}
                      className={`rounded-md px-2.5 py-1 text-xs ${mode === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300"}`}
                    >
                      {m === "preview" ? "미리보기" : "편집"}
                    </button>
                  ))}
                </div>
                {prevVersion && (
                  <Button variant={compare ? "primary" : "secondary"} size="sm" onClick={() => { setCompare((c) => !c); setMode("preview"); }}>
                    {compare ? "비교 닫기" : "이전과 비교"}
                  </Button>
                )}
                <CopyButton text={stripMarkdown(body)} label="본문 복사" />
                <ExportMenu
                  onMd={() => downloadText(`${fileBase}.md`, body, "text/markdown")}
                  onTxt={() => downloadText(`${fileBase}.txt`, stripMarkdown(body))}
                  printHref={`/print/${app.id}/${doc.id}`}
                />
              </>
            ) : null
          }
        >
          <div className="space-y-3">
            <AgentStatus {...agent} onStop={agent.stop} />
            {!doc.content.trim() && !agent.busy && mode !== "edit" ? (
              <Empty icon="📝">
                왼쪽에서 설정하고 쓰기를 누르면 회사 프로필과 내 프로필을 바탕으로 초안을 써요.
                <br />
                이미 쓴 서류가 있다면 붙여넣고 바로 평가받을 수도 있어요.
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setMode("edit")}>직접 붙여넣기</Button>
                </div>
              </Empty>
            ) : mode === "edit" && !agent.busy ? (
              <textarea
                autoFocus
                className={`${inputCls} min-h-[32rem] font-mono text-[13px] leading-relaxed`}
                value={doc.content}
                onChange={(e) => update({ content: e.target.value })}
                onBlur={() => update((d) => withSnapshot(d, "직접 수정"))}
              />
            ) : compare && prevVersion && !agent.busy ? (
              <DiffView before={splitMemo(prevVersion.content).body} after={body} beforeLabel={prevVersion.note} />
            ) : (
              <Markdown>{body}</Markdown>
            )}
          </div>
        </Card>

        {memo && !agent.busy && (
          <Card title={memo.startsWith("#### 수정 내역") ? "수정 내역" : "작성 메모"}>
            <Markdown>{memo.replace(/^####\s*(작성 메모|수정 내역)\s*/, "")}</Markdown>
          </Card>
        )}

        {doc.content.trim() && !agent.busy && (
          <Card title="다음 단계">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => goTab("evaluate", { doc: doc.id })}>{lastEval ? "다시 평가받기" : `${app.company || "회사"} 기준으로 평가받기`}</Button>
                {lastEval && (
                  <span className="text-sm text-zinc-500">
                    마지막 평가 <Badge tone={scoreTone(lastEval.score)}>{lastEval.score ?? "-"}점</Badge>
                    {lastEval.versionId !== latestVersionId(doc) && <span className="ml-1 text-xs">(평가 후 수정됨)</span>}
                  </span>
                )}
              </div>
              <Field label="원하는 방향으로 고쳐쓰기" hint="예: 더 간결하게 / 첫 문장을 더 강하게 / 1번 문항 글자 수를 600자로 줄여줘">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    aria-label="고쳐쓰기 요청"
                    placeholder="어떻게 고칠까요?"
                    value={revision}
                    onChange={(e) => setRevision(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing && revision.trim()) generate("revise", revision.trim());
                    }}
                  />
                  <Button variant="secondary" disabled={!revision.trim()} onClick={() => generate("revise", revision.trim())}>고쳐쓰기</Button>
                </div>
              </Field>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function QuestionsEditor({ doc, update }: { doc: Doc; update: (p: Partial<Doc>) => void }) {
  const set = (id: string, patch: Partial<Doc["questions"][number]>) =>
    update({ questions: doc.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  return (
    <Field label="자소서 문항" hint="회사 채용 사이트의 문항을 그대로 붙여넣고 글자 수 제한(공백 포함)을 적어 주세요.">
      <div className="space-y-2">
        {doc.questions.map((q, i) => (
          <div key={q.id} className="flex gap-2">
            <span className="mt-2 w-5 shrink-0 text-right text-sm text-zinc-400">{i + 1}.</span>
            <textarea
              className={`${inputCls} h-16 flex-1`}
              value={q.question}
              placeholder="문항 내용"
              onChange={(e) => set(q.id, { question: e.target.value })}
            />
            <div className="flex w-24 shrink-0 flex-col gap-1">
              <div className="relative">
                <input
                  className={`${inputCls} pr-6`}
                  inputMode="numeric"
                  value={q.limit ?? ""}
                  placeholder="제한"
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    set(q.id, { limit: Number.isFinite(n) ? n : null });
                  }}
                />
                <span className="pointer-events-none absolute right-2 top-2 text-xs text-zinc-400">자</span>
              </div>
              <button className="text-xs text-zinc-400 hover:text-red-500" onClick={() => update({ questions: doc.questions.filter((x) => x.id !== q.id) })}>
                삭제
              </button>
            </div>
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={() => update({ questions: [...doc.questions, { id: uid(), question: "", limit: 500 }] })}>
          + 문항 추가
        </Button>
      </div>
    </Field>
  );
}

function CharCountTable({ doc, body }: { doc: Doc; body: string }) {
  const answers = splitAnswers(body);
  if (!answers.length) return null;
  const rows = answers.map((a) => {
    const q = doc.questions[a.index - 1];
    const c = countChars(stripMarkdown(a.body));
    const limit = q?.limit ?? null;
    return { a, q, c, limit, over: limit != null && c.withSpaces > limit, low: limit != null && c.withSpaces < limit * 0.8 };
  });
  return (
    <Card title="문항별 글자 수" subtitle="공백 포함 기준이에요. 사이트마다 세는 방식이 조금 달라 제출 전에 한 번 더 확인해 주세요.">
      <ul className="space-y-3">
        {rows.map(({ a, q, c, limit, over, low }) => (
          <li key={a.index} className="space-y-1.5">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="flex min-w-0 flex-1 gap-1.5 leading-snug" title={q?.question || a.heading}>
                <span className="shrink-0 font-medium text-zinc-400">{a.index}.</span>
                <span className="line-clamp-2">{q?.question || a.heading}</span>
              </span>
              <span className={`shrink-0 tabular-nums ${over ? "font-semibold text-red-600" : low ? "text-amber-600" : "text-zinc-700 dark:text-zinc-300"}`}>
                {c.withSpaces.toLocaleString()}
                {limit ? <span className="text-zinc-400"> / {limit.toLocaleString()}</span> : null}
              </span>
            </div>
            {limit ? (
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${over ? "bg-red-500" : low ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, (c.withSpaces / limit) * 100)}%` }}
                />
              </div>
            ) : null}
            <p className="text-xs text-zinc-500">
              공백 제외 {c.withoutSpaces.toLocaleString()}자
              {limit ? (over ? ` · ${(c.withSpaces - limit).toLocaleString()}자 초과` : ` · ${(limit - c.withSpaces).toLocaleString()}자 남음`) : ""}
            </p>
          </li>
        ))}
      </ul>
      {rows.some((r) => r.over) && (
        <p className="mt-3 text-xs text-red-600">글자 수를 넘긴 문항이 있어요. 고쳐쓰기에 &quot;N번 문항을 제한에 맞게 줄여줘&quot;라고 요청해 보세요.</p>
      )}
      {rows.some((r) => r.low) && !rows.some((r) => r.over) && (
        <p className="mt-3 text-xs text-amber-700">제한의 80%보다 짧은 문항이 있어요. 보통 90% 이상 채우는 게 좋아요.</p>
      )}
    </Card>
  );
}

function ExportMenu({ onMd, onTxt, printHref }: { onMd: () => void; onTxt: () => void; printHref: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>내보내기</Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-zinc-200 bg-white p-1 text-sm shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <a href={printHref} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
              PDF로 저장 / 인쇄
            </a>
            <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => { onTxt(); setOpen(false); }}>
              텍스트(.txt)
            </button>
            <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => { onMd(); setOpen(false); }}>
              마크다운(.md)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
