"use client";
import { Home, Menu, Plus, Settings, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/brand";
import { ProgressBar } from "@/components/ui";
import { useHealth } from "@/lib/client";
import { useStore } from "@/lib/store";
import { dDay } from "@/lib/text";
import { profileFilled } from "@/lib/types";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data, ready, createApp, saveError } = useStore();
  const { health } = useHealth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const filled = profileFilled(data.profile);
  const apps = [...data.applications].sort((a, b) => b.updatedAt - a.updatedAt);

  const newApp = () => router.push(`/apply/${createApp()}?tab=research`);

  const nav = (
    <nav className="flex h-full flex-col p-3">
      <Link href="/app" className="mb-5 mt-1 px-2.5">
        <Wordmark size={28} />
      </Link>

      <div className="space-y-0.5">
        <NavLink href="/app" active={pathname === "/app"} icon={<Home />}>홈</NavLink>
        <NavLink href="/profile" active={pathname === "/profile"} icon={<UserRound />}>
          <span className="flex w-full items-center justify-between gap-2">
            내 프로필
            {ready && filled < 0.5 && <span className="size-1.5 rounded-full bg-pen" aria-label="채울 항목이 있어요" />}
          </span>
        </NavLink>
      </div>

      <div className="mb-1.5 mt-6 flex items-center justify-between px-2.5">
        <span className="text-xs font-semibold text-slate-500">지원 회사</span>
        <button
          onClick={newApp}
          className="flex size-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-900/5 hover:text-brand-900 dark:hover:bg-sheet/5 dark:hover:text-white"
          aria-label="새 지원 회사 추가"
          title="새 지원 회사 추가"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="-mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
        {ready && apps.length === 0 && (
          <button
            onClick={newApp}
            className="w-full rounded-lg border border-dashed border-rule px-3 py-3 text-left text-sm text-slate-500 hover:border-brand-400 hover:text-brand-800"
          >
            첫 지원 회사 추가하기
          </button>
        )}
        {apps.map((a) => {
          const d = a.status === "준비 중" ? dDay(a.deadline) : null;
          const active = pathname === `/apply/${a.id}`;
          return (
            <Link
              key={a.id}
              href={`/apply/${a.id}`}
              className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition ${active ? "bg-sheet font-semibold text-brand-900 shadow-sm ring-1 ring-rule dark:text-white" : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-sheet/5"}`}
            >
              <span className="min-w-0 truncate">
                {a.company || "새 지원"}
                {a.role && <span className="ml-1.5 text-xs font-normal text-slate-500">{a.role}</span>}
              </span>
              {d && (
                <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${d.tone === "urgent" ? "text-pen" : d.tone === "soon" ? "text-amber-700 dark:text-amber-400" : "text-slate-400"}`}>
                  {d.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-3 space-y-2 border-t border-rule pt-3">
        {ready && filled < 1 && (
          <Link href="/profile" className="block space-y-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-500 hover:bg-slate-900/5 dark:hover:bg-sheet/5">
            <span className="flex justify-between">
              <span>프로필 완성도</span>
              <span className="tabular-nums">{Math.round(filled * 100)}%</span>
            </span>
            <ProgressBar value={filled} />
          </Link>
        )}
        <NavLink href="/settings" active={pathname === "/settings"} icon={<Settings />}>설정과 백업</NavLink>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      {/* 모바일 상단 바 */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur md:hidden">
        <Link href="/app"><Wordmark size={26} /></Link>
        <button onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-900/5 dark:text-slate-200" aria-label="메뉴 열기">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal aria-label="메뉴">
          <div className="absolute inset-0 bg-brand-950/40" onClick={() => setOpen(false)} />
          {/* 메뉴 안의 링크나 버튼을 누르면 서랍을 닫아요. */}
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-paper shadow-xl"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a, button")) setOpen(false);
            }}
          >
            <button onClick={() => setOpen(false)} className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5" aria-label="메뉴 닫기">
              <X className="size-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 border-r border-rule bg-slate-100/60 md:block dark:bg-slate-950/40">{nav}</aside>

      <main className="min-w-0 flex-1">
        {health && !health.hasKey && !health.mock && (
          <Banner tone="red">
            서버에 Claude API 키가 없어요. <code>.env.local</code>에 <code>ANTHROPIC_API_KEY</code>를 넣고 서버를 다시 시작해 주세요.
          </Banner>
        )}
        {health?.mock && <Banner tone="amber">모의 응답 모드예요. API 키 없이 화면을 확인하는 용도라 에이전트가 예시 답변을 보여줘요.</Banner>}
        {health?.needsCode && !health.codeOk && (
          <Banner tone="amber">
            접근 코드가 필요해요. <Link href="/settings" className="font-semibold underline">설정</Link>에서 코드를 입력해 주세요.
          </Banner>
        )}
        {saveError && <Banner tone="red">브라우저 저장 공간이 가득 찼어요. 설정에서 백업을 내려받고 오래된 지원 회사를 정리해 주세요.</Banner>}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-9">{ready ? children : <div className="h-40" />}</div>
      </main>
    </div>
  );
}

function NavLink({ href, active, icon, children }: { href: string; active: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition [&>svg]:size-4 [&>svg]:shrink-0 ${active ? "bg-sheet font-semibold text-brand-900 shadow-sm ring-1 ring-rule dark:text-white" : "text-slate-700 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-sheet/5"}`}
    >
      {icon}
      {children}
    </Link>
  );
}

function Banner({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) {
  return (
    <div
      className={`no-print border-b px-4 py-2.5 text-sm md:px-8 ${tone === "red" ? "border-pen/30 bg-pen-soft text-pen" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"}`}
    >
      {children}
    </div>
  );
}
