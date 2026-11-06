"use client";
import { useRef, useState } from "react";
import { Badge, Button, Card, PageHeader, inputCls } from "@/components/ui";
import { SITE } from "@/lib/site";
import { getAccessCode, setAccessCode, useHealth } from "@/lib/client";
import { useStore } from "@/lib/store";
import { downloadText, todayStringSafe } from "@/lib/text";
import { emptyProfile, type AppData } from "@/lib/types";

export default function SettingsPage() {
  const { data, replaceAll } = useStore();
  const { health, refresh } = useHealth();
  const [code, setCode] = useState(getAccessCode);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const size = new Blob([JSON.stringify(data)]).size;

  const importFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as AppData;
      if (parsed?.version !== 2 || !Array.isArray(parsed.applications)) throw new Error();
      if (!confirm(`백업 파일로 지금 데이터를 바꿀까요? (지원 ${parsed.applications.length}곳)`)) return;
      replaceAll(parsed);
      setMsg("백업을 불러왔어요.");
    } catch {
      setMsg("올바른 백업 파일이 아니에요.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="설정과 백업" description="로그인 없이 쓰는 동안에는 모든 데이터가 이 브라우저에만 저장돼요." />

      <Card title="서버 상태">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {health ? (
            <>
              <Badge tone={health.hasKey ? "green" : health.mock ? "amber" : "red"}>
                {health.hasKey ? "Claude API 연결됨" : health.mock ? "모의 응답 모드" : "API 키 없음"}
              </Badge>
              {health.needsCode && <Badge tone={health.codeOk ? "green" : "amber"}>{health.codeOk ? "접근 코드 확인됨" : "접근 코드 필요"}</Badge>}
            </>
          ) : (
            <span className="text-slate-500">확인 중…</span>
          )}
        </div>
      </Card>

      {health?.needsCode && (
        <Card title="접근 코드" subtitle="운영자가 정한 코드예요. 이 브라우저에만 저장돼요.">
          <div className="flex max-w-md gap-2">
            <input className={inputCls} type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="접근 코드" />
            <Button onClick={() => { setAccessCode(code.trim()); refresh(); }}>저장</Button>
          </div>
        </Card>
      )}

      <Card title="데이터 백업" subtitle="브라우저 기록을 지우거나 다른 기기로 옮길 때는 백업 파일을 내려받아 두세요.">
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["지원 회사", `${data.applications.length}곳`],
              ["서류", `${data.applications.reduce((n, a) => n + a.docs.length, 0)}개`],
              ["면접 연습", `${data.applications.reduce((n, a) => n + a.interviews.length, 0)}회`],
              ["용량", `${(size / 1024).toFixed(0)}KB`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-900/[0.03] px-3 py-2.5 dark:bg-white/5">
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadText(`${SITE.name}-백업-${todayStringSafe()}.json`, JSON.stringify(data, null, 2), "application/json")}>
              백업 내려받기
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>백업 불러오기</Button>
          </div>
          {msg && <p className="text-sm text-brand-800 dark:text-brand-200">{msg}</p>}
        </div>
      </Card>

      <Card title="모든 데이터 지우기" subtitle="프로필, 지원 회사, 서류, 면접 기록이 모두 지워져요. 되돌릴 수 없으니 먼저 백업해 주세요.">
          <div>
            <Button
              variant="danger"
              className="ring-1 ring-pen/30"
              onClick={() => {
                if (confirm("정말 모든 데이터를 지울까요? 되돌릴 수 없어요.")) {
                  replaceAll({ version: 2, profile: emptyProfile(), applications: [] });
                  setMsg("모든 데이터를 지웠어요.");
                }
              }}
            >
              모두 지우기
            </Button>
          </div>
      </Card>
    </div>
  );
}
