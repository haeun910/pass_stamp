"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, ProgressBar, scoreTone } from "@/components/ui";
import { appProgress } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { dDay, relativeTime } from "@/lib/text";
import { profileFilled } from "@/lib/types";

const FLOW = [
  { n: 1, title: "회사 리서치", desc: "웹을 뒤져 인재상, 최근 이슈, 직무 요건, 평가 기준을 정리해요." },
  { n: 2, title: "맞춤 서류", desc: "내 프로필의 실제 경험만으로 자소서, 이력서, 포트폴리오를 써요." },
  { n: 3, title: "회사 기준 평가", desc: "그 회사 평가관처럼 채점하고, 피드백을 반영한 수정본까지 만들어요." },
  { n: 4, title: "모의 면접", desc: "서류를 읽은 면접관이 꼬리질문까지. 끝나면 질문별 피드백을 줘요." },
];

export default function Home() {
  const { data, createApp } = useStore();
  const router = useRouter();
  const filled = profileFilled(data.profile);
  const apps = [...data.applications].sort((a, b) => b.updatedAt - a.updatedAt);

  const newApp = () => router.push(`/apply/${createApp()}?tab=research`);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{data.profile.name ? `${data.profile.name}님, 안녕하세요` : "온라인 면접관"}</h1>
          <p className="mt-1 text-sm text-zinc-500">회사 리서치부터 면접 연습까지, 지원하는 회사 기준으로 한 번에 준비해요.</p>
        </div>
        <Button onClick={newApp}>+ 새 지원 회사</Button>
      </div>

      {filled < 0.5 && (
        <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">먼저 내 프로필을 채워 주세요</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                서류 작성과 면접 에이전트는 프로필에 있는 경험만 사용해요. 기존 이력서 PDF를 올리면 자동으로 정리해 드려요.
              </p>
              <div className="mt-3 max-w-xs"><ProgressBar value={filled} /></div>
            </div>
            <Link href="/profile"><Button variant="secondary">프로필 채우기</Button></Link>
          </div>
        </Card>
      )}

      {apps.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW.map((f) => (
            <div key={f.n} className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">{f.n}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-zinc-500">지원 현황 · {apps.length}곳</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apps.map((a) => {
              const p = appProgress(a);
              const d = dDay(a.deadline);
              return (
                <Link
                  key={a.id}
                  href={`/apply/${a.id}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-indigo-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold group-hover:text-indigo-600">{a.company || "새 지원"}</h3>
                      <p className="truncate text-sm text-zinc-500">{a.role || "직무 미입력"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={a.status === "최종 합격" ? "green" : a.status === "불합격" ? "red" : "indigo"}>{a.status}</Badge>
                      {d && <span className={`text-xs font-medium ${d.tone === "urgent" ? "text-red-600" : "text-zinc-500"}`}>{d.label}</span>}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {p.steps.map((s) => (
                      <div key={s.key} title={s.label} className={`h-1.5 flex-1 rounded-full ${s.done ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-800"}`} />
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    {p.docScore != null && <Badge tone={scoreTone(p.docScore)}>서류 {p.docScore}점</Badge>}
                    {p.interviewScore != null && <Badge tone={scoreTone(p.interviewScore)}>면접 {p.interviewScore}점</Badge>}
                    <span className="ml-auto">{p.nextStep ? `다음: ${p.nextStep.label}` : "모든 단계 완료"} · {relativeTime(a.updatedAt)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
