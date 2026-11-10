"use client";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { dDay } from "@/lib/text";
import type { Application } from "@/lib/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00`).getTime());

interface Entry {
  app: Application;
  date: string;
  d: ReturnType<typeof dDay>;
  /** 아직 준비 중이고 마감이 지나지 않았는지. 아니면 흐리게 보여요. */
  active: boolean;
}

/** 마감일 칩 색. 준비 중인 지원만 D-day 기준으로 색을 입히고, 제출했거나 지난 건 흐리게 둬요. */
function tone(e: Entry): string {
  if (!e.active) return "bg-slate-900/[0.04] text-slate-500 dark:bg-white/5 dark:text-slate-400";
  if (e.d?.tone === "urgent") return "bg-pen-soft text-pen";
  if (e.d?.tone === "soon") return "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
  return "bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100";
}

function dotTone(e: Entry): string {
  if (!e.active) return "bg-slate-300 dark:bg-slate-600";
  if (e.d?.tone === "urgent") return "bg-pen";
  if (e.d?.tone === "soon") return "bg-amber-500";
  return "bg-brand-700 dark:bg-brand-300";
}

/**
 * 지원 회사의 마감일을 달마다 모아 보는 달력이에요. 마감일은 지원 회사 개요 탭에서 정해요.
 * 좁은 화면에서는 칸 안에 점만 찍고, 달력 아래 목록에서 회사 이름과 D-day를 보여줘요.
 */
export function DeadlineCalendar({ apps }: { apps: Application[] }) {
  const [now] = useState(() => new Date());
  const todayKey = keyOf(now.getFullYear(), now.getMonth(), now.getDate());
  const [cursor, setCursor] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));

  const entries = useMemo<Entry[]>(
    () =>
      apps
        .filter((a) => isDateKey(a.deadline))
        .map((a) => {
          const d = dDay(a.deadline);
          return { app: a, date: a.deadline, d, active: a.status === "준비 중" && d?.tone !== "past" };
        })
        .sort((x, y) => x.date.localeCompare(y.date) || x.app.company.localeCompare(y.app.company, "ko")),
    [apps],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return m;
  }, [entries]);

  const { y, m } = cursor;
  const monthPrefix = `${y}-${pad(m + 1)}-`;
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = first.getDay();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  // 앞뒤 달의 날짜도 흐리게 채워서 주 단위로 마감이 이어지는 걸 볼 수 있게 해요.
  const cells = Array.from({ length: cellCount }, (_, i) => {
    const date = new Date(y, m, 1 - offset + i);
    return { key: keyOf(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), inMonth: date.getMonth() === m, weekday: date.getDay() };
  });
  const weeks = Array.from({ length: cellCount / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix));
  const upcoming = entries.find((e) => e.active && !e.date.startsWith(monthPrefix));
  const move = (delta: number) => setCursor(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));
  const isThisMonth = y === now.getFullYear() && m === now.getMonth();

  return (
    <section className="rounded-xl border border-rule bg-sheet" aria-labelledby="deadline-calendar-title">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <h2 id="deadline-calendar-title" className="font-serif text-lg font-bold tabular-nums text-brand-900 dark:text-white" aria-live="polite">
          {y}년 {m + 1}월
        </h2>
        <div className="flex items-center gap-1">
          {!isThisMonth && (
            <button
              onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
              className="mr-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5"
            >
              오늘
            </button>
          )}
          <button onClick={() => move(-1)} className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5" aria-label="이전 달">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => move(1)} className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/5" aria-label="다음 달">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{`${y}년 ${m + 1}월 마감 달력. 날짜별 마감 목록은 달력 아래에 있어요.`}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((w, i) => (
              <th key={w} scope="col" className={`py-2 text-xs font-semibold ${i === 0 ? "text-pen" : "text-slate-500"}`}>
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi} className="border-t border-rule">
              {week.map((c) => {
                const list = byDate.get(c.key) ?? [];
                const today = c.key === todayKey;
                return (
                  <td key={c.key} className={`h-16 align-top sm:h-24 ${c.inMonth ? "" : "bg-slate-900/[0.02] dark:bg-white/[0.02]"} [&:not(:first-child)]:border-l [&:not(:first-child)]:border-rule`}>
                    <div className="flex h-full flex-col gap-1 p-1 sm:p-1.5">
                      <span
                        className={`flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${
                          today
                            ? "bg-brand-900 font-bold text-white dark:bg-brand-200 dark:text-brand-950"
                            : !c.inMonth
                              ? "text-slate-300 dark:text-slate-600"
                              : c.weekday === 0
                                ? "text-pen"
                                : "text-slate-600 dark:text-slate-300"
                        }`}
                        aria-label={today ? `오늘, ${c.day}일` : undefined}
                      >
                        {c.day}
                      </span>
                      {list.length > 0 && (
                        <>
                          {/* 넓은 화면: 회사 이름 칩. 두 개까지 보이고 나머지는 숫자로 */}
                          <ul className="hidden min-w-0 space-y-0.5 sm:block">
                            {list.slice(0, 2).map((e) => (
                              <li key={e.app.id}>
                                <Link
                                  href={`/apply/${e.app.id}`}
                                  className={`block truncate rounded px-1.5 py-0.5 text-[11px] font-semibold leading-4 hover:ring-1 hover:ring-current ${tone(e)}`}
                                  title={`${e.app.company || "새 지원"}${e.app.role ? ` · ${e.app.role}` : ""} · ${e.app.status}`}
                                >
                                  {e.app.company || "새 지원"}
                                </Link>
                              </li>
                            ))}
                            {list.length > 2 && <li className="px-1.5 text-[11px] text-slate-500">+{list.length - 2}곳</li>}
                          </ul>
                          {/* 좁은 화면: 점으로만 표시 */}
                          <span className="flex flex-wrap gap-0.5 px-1 sm:hidden" aria-hidden>
                            {list.slice(0, 3).map((e) => (
                              <span key={e.app.id} className={`size-1.5 rounded-full ${dotTone(e)}`} />
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-rule px-4 py-4 sm:px-5">
        <h3 className="text-sm font-bold">
          {m + 1}월 마감 <span className="font-normal text-slate-500">{monthEntries.length}곳</span>
        </h3>
        {monthEntries.length > 0 ? (
          <ul className="mt-2 divide-y divide-rule">
            {monthEntries.map((e) => {
              const date = new Date(`${e.date}T00:00:00`);
              return (
                <li key={e.app.id}>
                  <Link href={`/apply/${e.app.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-900/[0.03] dark:hover:bg-white/5">
                    <span className="w-16 shrink-0 text-xs tabular-nums text-slate-500">
                      {date.getMonth() + 1}/{date.getDate()} ({WEEKDAYS[date.getDay()]})
                    </span>
                    <span className={`w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${tone(e)}`}>
                      {e.app.status === "준비 중" ? e.d?.label : "제출"}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className={`font-medium ${e.active ? "" : "text-slate-500"}`}>{e.app.company || "새 지원"}</span>
                      {e.app.demo && <span className="ml-1.5 rounded bg-marker/60 px-1 text-[10px] font-semibold text-brand-900 dark:bg-marker dark:text-amber-50">예시</span>}
                      {e.app.role && <span className="ml-1.5 text-xs text-slate-500">{e.app.role}</span>}
                    </span>
                    <span className="hidden shrink-0 sm:inline">
                      <Badge tone={e.app.status === "최종 합격" ? "green" : e.app.status === "불합격" ? "red" : "slate"}>{e.app.status}</Badge>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : entries.length === 0 ? (
          <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
            <CalendarDays className="mt-0.5 size-4 shrink-0" />
            아직 마감일을 넣은 지원 회사가 없어요. 지원 회사의 개요 탭에서 마감일을 넣으면 여기에 모여요.
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            이 달에는 마감이 없어요.
            {upcoming && (
              <>
                {" "}
                <button
                  className="font-semibold text-brand-800 underline-offset-2 hover:underline dark:text-brand-200"
                  onClick={() => {
                    const [ny, nm] = upcoming.date.split("-").map(Number);
                    setCursor({ y: ny, m: nm - 1 });
                  }}
                >
                  다음 마감 보기: {Number(upcoming.date.slice(5, 7))}월 {Number(upcoming.date.slice(8, 10))}일 {upcoming.app.company || "새 지원"}
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
