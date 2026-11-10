"use client";
import { Eye, Home, LogIn, Menu, Plus, Settings, UserCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountBox } from "@/components/auth/AccountBox";
import { WaitingScreen } from "@/components/auth/WaitingScreen";
import { Wordmark } from "@/components/brand";
import { ProgressBar } from "@/components/ui";
import { useHealth } from "@/lib/client";
import { DEMO_APP_ID } from "@/lib/demo-id";
import { StoreProvider, storageKeyFor, useStore } from "@/lib/store";
import { dDay } from "@/lib/text";
import { profileFilled } from "@/lib/types";
import type { Viewer } from "@/lib/viewer";
import { ViewerContext } from "@/lib/viewer-context";

/**
 * local: 로그인을 안 쓰는 로컬 개발. member: 승인된 계정. demo: 로그인 전이거나 승인 전에 예시 지원 건을 보는 중.
 * waiting: 승인 대기나 이용 중지. login: 세션이 없거나 만료돼서 로그인 화면으로 보내는 중.
 */
type Mode = "local" | "member" | "demo" | "waiting" | "login";

export function AppShell({ auth, viewer, children }: { auth: boolean; viewer: Viewer | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isDemo = pathname.startsWith(`/apply/${DEMO_APP_ID}`);
  const mode: Mode = !auth ? "local" : viewer?.status === "approved" ? "member" : isDemo ? "demo" : viewer ? "waiting" : "login";

  // 쿠키는 있지만 만료됐거나 지워진 세션이면 여기로 와요. 보던 주소로 돌아오게 next를 붙여요.
  useEffect(() => {
    if (mode === "login") router.replace(`/login?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [mode, pathname, router]);

  if (mode === "login") {
    return (
      <p role="status" className="py-24 text-center text-sm text-slate-500">
        로그인 화면으로 이동하는 중이에요…
      </p>
    );
  }
  if (mode === "waiting" && viewer) return <WaitingScreen viewer={viewer} />;

  // 계정마다 따로 저장해요. 예시를 보는 손님은 따로 둬서 나중에 로그인한 계정의 데이터와 섞이지 않게 해요.
  const storageKey = storageKeyFor(mode === "local" ? null : mode === "member" && viewer ? viewer.id : "guest");
  return (
    <ViewerContext.Provider value={{ auth, viewer: mode === "member" ? viewer : null }}>
      <StoreProvider key={storageKey} storageKey={storageKey} adoptLegacy={mode === "member"}>
        <Frame mode={mode} viewer={viewer}>
          {children}
        </Frame>
      </StoreProvider>
    </ViewerContext.Provider>
  );
}

function Frame({ mode, viewer, children }: { mode: Mode; viewer: Viewer | null; children: React.ReactNode }) {
  const { data, ready, createApp, saveError } = useStore();
  const { health } = useHealth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingCount = usePendingCount(Boolean(viewer?.isAdmin && mode === "member"));

  const filled = profileFilled(data.profile);
  const apps = [...data.applications].sort((a, b) => b.updatedAt - a.updatedAt);
  const demo = mode === "demo";

  const newApp = () => router.push(`/apply/${createApp()}?tab=research`);

  const nav = demo ? (
    <nav className="flex h-full flex-col p-3">
      <Link href="/" className="mb-5 mt-1 px-2.5">
        <Wordmark size={28} />
      </Link>
      <NavLink href={`/apply/${DEMO_APP_ID}?tab=overview`} active icon={<Eye />}>예시 지원 건</NavLink>
      <div className="mt-6 space-y-3 rounded-lg border border-rule bg-sheet p-3.5 text-sm">
        <p className="leading-relaxed text-slate-600 dark:text-slate-300">
          {viewer ? "운영자가 이용 신청을 승인하면 내 프로필로 직접 준비할 수 있어요." : "직접 준비하려면 이용 신청을 해 주세요. 승인되면 바로 쓸 수 있어요."}
        </p>
        {!viewer && (
          <div className="space-y-1.5">
            <Link
              href="/signup"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-brand-900 text-sm font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950"
            >
              이용 신청하기
            </Link>
            <Link href="/login" className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-brand-900 hover:bg-brand-900/5 dark:text-brand-200">
              <LogIn className="size-4" />로그인
            </Link>
          </div>
        )}
      </div>
    </nav>
  ) : (
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
        {viewer?.isAdmin && (
          <NavLink href="/admin" active={pathname === "/admin"} icon={<UserCheck />}>
            <span className="flex w-full items-center justify-between gap-2">
              가입 신청 관리
              {pendingCount > 0 && (
                <span className="rounded-full bg-pen px-1.5 text-[11px] font-bold tabular-nums text-white" aria-label={`승인 대기 ${pendingCount}명`}>
                  {pendingCount}
                </span>
              )}
            </span>
          </NavLink>
        )}
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
                {a.demo && <span className="ml-1.5 rounded bg-marker/60 px-1 text-[10px] font-semibold text-brand-900 dark:bg-marker dark:text-amber-50">예시</span>}
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
        {viewer && mode === "member" && <AccountBox viewer={viewer} />}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-900 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">
        본문으로 건너뛰기
      </a>
      {/* 모바일 상단 바 */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur md:hidden">
        <Link href={demo ? "/" : "/app"}><Wordmark size={26} /></Link>
        <button onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-900/5 dark:text-slate-200" aria-label="메뉴 열기">
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal aria-label="메뉴">
          <div className="absolute inset-0 bg-brand-950/40" onClick={() => setOpen(false)} />
          {/* 메뉴 안의 링크를 누르면 서랍을 닫아요. 로그아웃 확인처럼 서랍 안에서 이어지는 버튼은 data-keep-open으로 남겨요. */}
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-paper shadow-xl"
            onClick={(e) => {
              const t = (e.target as HTMLElement).closest("a, button");
              if (t && !t.closest("[data-keep-open]")) setOpen(false);
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

      <main id="main" className="min-w-0 flex-1">
        {health && !health.hasKey && !health.mock && (
          <Banner tone="red">
            서버에 Claude API 키가 없어요. <code>.env.local</code>에 <code>ANTHROPIC_API_KEY</code>를 넣고 서버를 다시 시작해 주세요.
          </Banner>
        )}
        {health?.mock && <Banner tone="amber">모의 응답 모드예요. API 키 없이 화면을 확인하는 용도라 에이전트가 예시 답변을 보여줘요.</Banner>}
        {health?.auth === "missing" && (
          <Banner tone="red">
            로그인 설정이 빠져 있어서 AI 기능을 막아 두었어요. 운영자는 <code>DATABASE_URL</code>과 <code>BETTER_AUTH_SECRET</code>을 넣고 다시 배포해 주세요.
          </Banner>
        )}
        {demo && (
          <Banner tone="amber">
            {viewer ? (
              <>예시를 보고 있어요. 이용 신청이 승인되면 직접 준비할 수 있어요.</>
            ) : (
              <>
                로그인 없이 예시를 보고 있어요. 직접 준비하려면{" "}
                <Link href="/signup" className="font-semibold underline">이용 신청</Link>을 하거나{" "}
                <Link href="/login" className="font-semibold underline">로그인</Link>해 주세요.
              </>
            )}
          </Banner>
        )}
        {saveError && <Banner tone="red">브라우저 저장 공간이 가득 찼어요. 설정에서 백업을 내려받고 오래된 지원 회사를 정리해 주세요.</Banner>}
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-9">{ready ? children : <PageSkeleton />}</div>
      </main>
    </div>
  );
}

/** 관리자에게만 승인 대기 인원을 보여줘요. 화면을 처음 열 때와 창으로 돌아올 때 다시 세요. */
function usePendingCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/users?summary=1", { cache: "no-store" });
        if (r.ok && alive) setCount(((await r.json()) as { pending: number }).pending ?? 0);
      } catch {}
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener("admin-users-changed", load);
    return () => {
      alive = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("admin-users-changed", load);
    };
  }, [enabled]);
  return count;
}

/** 브라우저 저장소를 읽는 아주 짧은 순간에 보여요. 화면이 비어 보이지 않게만 해요. */
function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 motion-reduce:animate-none" aria-hidden>
      <div className="h-8 w-56 rounded-md bg-slate-900/5 dark:bg-white/5" />
      <div className="h-4 w-80 rounded-md bg-slate-900/5 dark:bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-slate-900/5 dark:bg-white/5" />
        ))}
      </div>
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
