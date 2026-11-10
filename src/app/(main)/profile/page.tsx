"use client";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { Button, Card, Field, PageHeader, ProgressBar, Spinner, inputCls } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findSensitive } from "@/lib/privacy";
import { PROFILE_SECTIONS, Profile, profileFilled } from "@/lib/types";

export default function ProfilePage() {
  const { data, setProfile } = useStore();
  const p = data.profile;
  const filled = profileFilled(p);
  const sensitive = findSensitive(Object.values(p).join("\n"));

  return (
    <div className="space-y-8">
      <PageHeader
        title="내 프로필"
        description="모든 에이전트가 이 내용으로 서류를 쓰고 면접 질문을 만들어요. 여기에 없는 경험은 지어내지 않으니, 생각나는 대로 자세히 적을수록 좋아요."
        actions={
          <div className="flex w-44 items-center gap-3 text-xs text-slate-500">
            <ProgressBar value={filled} />
            <span className="shrink-0 tabular-nums">{Math.round(filled * 100)}%</span>
          </div>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="lg:sticky lg:top-6 lg:order-2">
          <ImportCard onImport={(next, mode) => setProfile(mode === "replace" ? next : fillEmpty(p, next))} />
        </div>

        <Card title="프로필" subtitle="입력하는 즉시 이 브라우저에 저장돼요. 주민등록번호, 계좌번호 같은 번호는 적지 마세요. 서류에 필요 없어요." className="lg:order-1">
          {sensitive.length > 0 && (
            <p className="mb-4 rounded-lg bg-pen-soft px-3 py-2 text-sm text-pen" role="alert">
              {sensitive.join(", ")}로 보이는 번호가 있어요. 서버로 보낼 때는 가려지지만, 이 브라우저에는 그대로 남으니 지워 주세요.
            </p>
          )}
          <div className="grid gap-5 md:grid-cols-2">
            {PROFILE_SECTIONS.map((s) => (
              <div key={s.key} className={s.rows > 2 ? "md:col-span-2" : ""}>
                <Field label={s.label} hint={s.hint || undefined}>
                  {s.rows === 1 ? (
                    <input className={inputCls} value={p[s.key]} onChange={(e) => setProfile({ [s.key]: e.target.value })} />
                  ) : (
                    <textarea
                      className={`${inputCls} leading-relaxed`}
                      style={{ minHeight: `${s.rows * 1.6 + 1}rem` }}
                      value={p[s.key]}
                      onChange={(e) => setProfile({ [s.key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function fillEmpty(cur: Profile, next: Partial<Profile>): Partial<Profile> {
  const out: Partial<Profile> = {};
  for (const [k, v] of Object.entries(next) as [keyof Profile, string][]) {
    if (!cur[k]?.trim() && v?.trim()) out[k] = v;
    else if (cur[k]?.trim() && v?.trim() && !cur[k].includes(v.trim().slice(0, 20))) out[k] = `${cur[k].trim()}\n${v.trim()}`;
  }
  return out;
}

function ImportCard({ onImport }: { onImport: (p: Profile, mode: "merge" | "replace") => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Profile | null>(null);
  const [applied, setApplied] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async (payload: object) => {
    setBusy(true);
    setError("");
    setResult(null);
    setApplied("");
    try {
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "가져오지 못했어요.");
      setResult(j.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) return setError("3MB 이하 파일만 올릴 수 있어요. 큰 파일은 내용을 복사해 붙여넣어 주세요.");
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      const buf = await f.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      send({ kind: "pdf", data: btoa(bin) });
    } else {
      send({ kind: "text", text: await f.text() });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Card title="기존 이력서로 채우기" subtitle="PDF나 붙여넣은 글을 항목별로 나눠 드려요. 원문에 있는 내용만 옮겨요.">
      <div className="space-y-3">
        <input ref={fileRef} type="file" accept=".pdf,.txt,.md" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={busy}>
          <FileUp />이력서 파일 올리기
        </Button>
        <p className="text-center text-xs text-slate-400">PDF, TXT, 3MB까지</p>
        <textarea
          className={`${inputCls} h-28`}
          placeholder="또는 이력서나 자소서 내용을 여기에 붙여넣으세요"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button className="w-full" onClick={() => send({ kind: "text", text })} disabled={busy || !text.trim()}>
          {busy ? <><Spinner /> 정리하는 중…</> : "붙여넣은 글로 정리하기"}
        </Button>
        {error && <p className="text-sm text-pen">{error}</p>}

        {result && (
          <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900 dark:bg-brand-950/30">
            <p className="text-sm font-medium">이렇게 정리했어요. 확인하고 반영해 주세요.</p>
            <dl className="grid gap-2 text-sm">
              {PROFILE_SECTIONS.filter((s) => result[s.key]?.trim()).map((s) => (
                <div key={s.key} className="rounded-lg bg-sheet p-2.5">
                  <dt className="text-xs font-semibold text-slate-500">{s.label}</dt>
                  <dd className="mt-1 line-clamp-4 whitespace-pre-wrap">{result[s.key]}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { onImport(result, "merge"); setApplied("기존 내용에 더했어요."); setResult(null); setText(""); }}>기존 내용에 더하기</Button>
              <Button variant="secondary" onClick={() => { if (confirm("지금 프로필을 모두 덮어쓸까요?")) { onImport(result, "replace"); setApplied("프로필을 새 내용으로 바꿨어요."); setResult(null); setText(""); } }}>
                전부 덮어쓰기
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)}>취소</Button>
            </div>
          </div>
        )}
        {applied && <p className="text-sm text-pass">{applied}</p>}
      </div>
    </Card>
  );
}
