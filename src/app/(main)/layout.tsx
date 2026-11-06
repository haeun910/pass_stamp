"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, ProgressBar } from "@/components/ui";
import { useHealth } from "@/lib/client";
import { useStore } from "@/lib/store";
import { dDay } from "@/lib/text";
import { profileFilled } from "@/lib/types";

const dTone = { past: "zinc", urgent: "red", soon: "amber", normal: "indigo" } as const;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data, ready, createApp, saveError } = useStore();
  const { health } = useHealth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const filled = profileFilled(data.profile);
  const apps = [...data.applications].sort((a, b) => b.updatedAt - a.updatedAt);

  const newApp = () => {
    const id = createApp();
    setOpen(false);
    router.push(`/apply/${id}?tab=research`);
  };

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link href="/" className="mb-4 flex items-center gap-2.5 px-1" onClick={() => setOpen(false)}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">면</div>
        <div>
          <div className="font-bold leading-tight">온라인 면접관</div>
          <div className="text-xs text-zinc-500">AI 취업 준비 에이전트</div>
        </div>
      </Link>

      <NavLink href="/" active={pathname === "/"} onClick={() => setOpen(false)}>
        홈
      </NavLink>
      <NavLink href="/profile" active={pathname === "/profile"} onClick={() => setOpen(false)}>
        <span className="flex w-full items-center justify-between gap-2">
          내 프로필
          {ready && filled < 0.5 && <Badge tone="amber">{Math.round(filled * 100)}%</Badge>}
        </span>
      </NavLink>

      <div className="mt-5 mb-1 flex items-center justify-between px-2">
        <span className="text-xs font-semibold tracking-wide text-zinc-500">지원 회사</span>
        <button onClick={newApp} className="rounded-md px-1.5 text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600 dark:hover:bg-zinc-800" aria-label="새 지원 추가" title="새 지원 추가">
          +
        </button>
      </div>
      <div className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
        {ready && apps.length === 0 && (
          <button onClick={newApp} className="w-full rounded-lg border border-dashed border-zinc-300 px-3 py-3 text-left text-sm text-zinc-500 hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-700">
            + 첫 지원 회사 추가
          </button>
        )}
        {apps.map((a) => {
          const d = dDay(a.deadline);
          const active = pathname === `/apply/${a.id}`;
          return (
            <Link
              key={a.id}
              href={`/apply/${a.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${active ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              <span className="min-w-0 truncate">
                {a.company || "새 지원"}
                {a.role && <span className="ml-1.5 text-xs font-normal text-zinc-500">{a.role}</span>}
              </span>
              {d && a.status === "준비 중" && <Badge tone={dTone[d.tone]}>{d.label}</Badge>}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        {ready && filled < 1 && (
          <Link href="/profile" className="block space-y-1.5 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
            <span>프로필 완성도 {Math.round(filled * 100)}%</span>
            <ProgressBar value={filled} />
          </Link>
        )}
        <NavLink href="/settings" active={pathname === "/settings"} onClick={() => setOpen(false)}>
          설정 · 백업
        </NavLink>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* 모바일 상단 바 */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs text-white">면</span>
          온라인 면접관
        </Link>
        <button onClick={() => setOpen(true)} className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800" aria-label="메뉴 열기">
          ☰ 메뉴
        </button>
      </header>

      {/* 모바일 서랍 */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl dark:bg-zinc-900">{nav}</aside>
        </div>
      )}

      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 border-r border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-900">{nav}</aside>

      <main className="min-w-0 flex-1">
        {health && !health.hasKey && !health.mock && (
          <Banner tone="red">
            서버에 Claude API 키가 없어요. <code>.env.local</code>에 <code>ANTHROPIC_API_KEY</code>를 넣고 서버를 다시 시작해 주세요.
          </Banner>
        )}
        {health?.mock && <Banner tone="amber">모의 응답 모드예요. API 키 없이 화면만 확인할 수 있고, 에이전트는 예시 답변을 보여줘요.</Banner>}
        {health?.needsCode && !health.codeOk && (
          <Banner tone="amber">
            이 사이트는 접근 코드가 필요해요. <Link href="/settings" className="font-medium underline">설정</Link>에서 코드를 입력해 주세요.
          </Banner>
        )}
        {saveError && <Banner tone="red">브라우저 저장 공간이 가득 찼어요. 설정에서 백업을 내려받고 오래된 지원 건을 정리해 주세요.</Banner>}
        <div className="mx-auto max-w-6xl p-4 md:p-8">{ready ? children : <div className="h-40" />}</div>
      </main>
    </div>
  );
}

function NavLink({ href, active, children, onClick }: { href: string; active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center rounded-lg px-3 py-2 text-sm transition ${active ? "bg-zinc-100 font-medium dark:bg-zinc-800" : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}
    >
      {children}
    </Link>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <div
      className={`no-print border-b px-4 py-2.5 text-sm md:px-8 ${tone === "red" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"}`}
    >
      {children}
    </div>
  );
}
