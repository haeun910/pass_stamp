"use client";
import { useState, type ReactNode } from "react";

export function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-2">
        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</label>
        {right}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-zinc-500">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm",
  secondary:
    "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  danger: "text-red-600 hover:bg-red-50 dark:hover:bg-red-950",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm"} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm leading-relaxed text-zinc-500 dark:border-zinc-700">
      {icon && <div className="mb-2 text-2xl">{icon}</div>}
      {children}
    </div>
  );
}

const tones = {
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function scoreTone(score: number | null | undefined): Tone {
  if (score == null) return "zinc";
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  return "red";
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  render,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (v: T) => ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o}
          key={String(o)}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1 text-sm transition ${value === o ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"}`}
        >
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

/** 에이전트 진행 상태 줄: 무엇을 하는 중인지 + 중지 버튼 + 오류/알림 */
export function AgentStatus({
  busy,
  status,
  error,
  notice,
  onStop,
}: {
  busy: boolean;
  status: string;
  error: string;
  notice: string;
  onStop: () => void;
}) {
  if (!busy && !error && !notice) return null;
  return (
    <div className="space-y-2">
      {busy && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <span className="flex min-w-0 items-center gap-2">
            <Spinner className="shrink-0" />
            <span className="truncate">{status || "작업 중"}…</span>
          </span>
          <button onClick={onStop} className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900">
            중지
          </button>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">{error}</p>}
      {notice && !busy && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">{notice}</p>}
    </div>
  );
}

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={!text.trim()}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      {done ? "복사됨" : label}
    </Button>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}
