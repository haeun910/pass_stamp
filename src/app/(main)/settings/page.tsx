"use client";
import { useRef, useState } from "react";
import { Badge, Button, Card, Field, inputCls } from "@/components/ui";
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정 · 백업</h1>

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
            <span className="text-zinc-500">확인 중…</span>
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

      <Card title="데이터 백업" subtitle="로그인이 없어서 모든 데이터는 이 브라우저에만 있어요. 브라우저 기록을 지우거나 다른 기기로 옮길 때는 백업 파일을 써 주세요.">
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            지원 {data.applications.length}곳 · 서류 {data.applications.reduce((n, a) => n + a.docs.length, 0)}개 · 면접 {data.applications.reduce((n, a) => n + a.interviews.length, 0)}회 · {(size / 1024).toFixed(0)}KB
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadText(`온라인면접관-백업-${todayStringSafe()}.json`, JSON.stringify(data, null, 2), "application/json")}>
              백업 내려받기
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => importFile(e.target.files?.[0])} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>백업 불러오기</Button>
          </div>
          {msg && <p className="text-sm text-indigo-600">{msg}</p>}
        </div>
      </Card>

      <Card title="모든 데이터 지우기">
        <Field label="" hint="프로필, 지원 회사, 서류, 면접 기록이 모두 지워져요. 되돌릴 수 없으니 먼저 백업해 주세요.">
          <div>
            <Button
              variant="danger"
              className="border border-red-200 dark:border-red-900"
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
        </Field>
      </Card>
    </div>
  );
}
