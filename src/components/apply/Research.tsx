"use client";
import { useState } from "react";
import { Markdown } from "@/components/Markdown";
import { AgentStatus, Button, Card, CopyButton, Empty, Field, inputCls } from "@/components/ui";
import { baseContext, useAgent } from "@/lib/client";
import { useStore } from "@/lib/store";
import { formatDate } from "@/lib/text";
import { PanelProps } from "./shared";

export function ResearchPanel({ app, profile, goTab }: PanelProps) {
  const { updateApp } = useStore();
  const agent = useAgent();
  const [editing, setEditing] = useState(false);
  const update = (p: Parameters<typeof updateApp>[1]) => updateApp(app.id, p);

  const urlInvalid = app.jobUrl.trim() !== "" && !/^https?:\/\/\S+\.\S+/.test(app.jobUrl.trim());
  const stale = app.researchedAt && Date.now() - app.researchedAt > 1000 * 60 * 60 * 24 * 30;

  const start = async () => {
    setEditing(false);
    const prev = app.companyProfile;
    const res = await agent.run(
      "research",
      { ...baseContext(app, profile), companyProfile: "", profile: "" },
      {
        instruction: `${app.company}${app.role ? `의 ${app.role} 직무` : ""} 지원을 위해 회사를 조사하고 회사 프로필을 만들어 주세요.${app.jobUrl ? ` 채용공고 URL: ${app.jobUrl}` : ""}`,
      },
      (t) => update({ companyProfile: t }),
    );
    if (res.ok) update({ researchedAt: Date.now() });
    else if (!res.text.trim()) update({ companyProfile: prev });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card title="지원 정보" subtitle="채용공고가 있으면 넣어 주세요. 직무 요건이 훨씬 정확해져요.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Field label="회사 이름">
              <input className={inputCls} value={app.company} placeholder="예: 토스" onChange={(e) => update({ company: e.target.value })} />
            </Field>
            <Field label="지원 직무">
              <input className={inputCls} value={app.role} placeholder="예: 프론트엔드 개발자" onChange={(e) => update({ role: e.target.value })} />
            </Field>
          </div>
          <Field label="채용공고 링크 (선택)" hint="리서치 에이전트가 직접 읽어요. 로그인이 필요한 페이지는 읽을 수 없어요.">
            <input
              className={`${inputCls} ${urlInvalid ? "border-red-400" : ""}`}
              value={app.jobUrl}
              placeholder="https://"
              inputMode="url"
              onChange={(e) => update({ jobUrl: e.target.value })}
            />
          </Field>
          <Field label="채용공고 본문 (선택)" hint="링크를 읽을 수 없을 때 공고 내용을 붙여넣어 주세요.">
            <textarea className={`${inputCls} h-36`} value={app.jobPosting} onChange={(e) => update({ jobPosting: e.target.value })} />
          </Field>
          <Button onClick={start} disabled={agent.busy || !app.company.trim() || urlInvalid} className="w-full">
            {app.companyProfile ? "다시 조사하기" : "회사 조사 시작"}
          </Button>
          <p className="text-xs text-zinc-500">웹 검색과 정리에 1~3분 정도 걸려요. 다른 탭으로 옮겨도 계속 진행돼요.</p>
        </div>
      </Card>

      <Card
        title="회사 프로필"
        subtitle={app.researchedAt ? `${formatDate(app.researchedAt)} 조사${stale ? " · 한 달이 지났어요. 다시 조사해 보세요." : ""}` : undefined}
        actions={
          app.companyProfile && !agent.busy ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>{editing ? "완료" : "직접 수정"}</Button>
              <CopyButton text={app.companyProfile} />
            </>
          ) : null
        }
      >
        <div className="space-y-3">
          <AgentStatus {...agent} onStop={agent.stop} />
          {app.companyProfile ? (
            editing ? (
              <textarea className={`${inputCls} min-h-[32rem] font-mono text-[13px] leading-relaxed`} value={app.companyProfile} onChange={(e) => update({ companyProfile: e.target.value })} />
            ) : (
              <Markdown>{app.companyProfile}</Markdown>
            )
          ) : (
            !agent.busy && (
              <Empty icon="🔎">
                회사 이름을 넣고 조사를 시작하면 인재상, 최근 이슈, 직무 요건, 평가 기준이 담긴 회사 프로필을 만들어요.
                <br />
                서류 작성, 평가, 면접 에이전트가 모두 이 프로필을 기준으로 움직여요.
              </Empty>
            )
          )}
          {app.companyProfile && !agent.busy && (
            <div className="flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Button variant="secondary" onClick={() => goTab("docs")}>다음: 서류 작성 →</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
