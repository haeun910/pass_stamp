"use client";
import { Check, Copy, Square } from "lucide-react";
import { useState, type ReactNode } from "react";

export function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      {(label || right) && (
        <div className="flex items-end justify-between gap-2">
          {label && <label className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{label}</label>}
          {right}
        </div>
      )}
      {children}
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-rule bg-sheet px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-400 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-900";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "pen";
const variants: Record<Variant, string> = {
  primary: "bg-brand-900 text-white hover:bg-brand-800 active:bg-brand-950 dark:bg-brand-200 dark:text-brand-950 dark:hover:bg-brand-100",
  secondary: "border border-rule bg-sheet text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800",
  ghost: "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
  danger: "text-pen hover:bg-pen-soft",
  pen: "bg-pen text-white hover:brightness-110",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 px-2.5 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/** 작업 패널. 서류(종이)와 구분되도록 테두리만 가볍게. */
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
    <section className={`rounded-xl border border-rule bg-sheet p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** 서류 한 장. 실제 제출 서류처럼 보이도록 종이 질감과 여백을 줘요. */
export function Sheet({ children, className = "", header }: { children: ReactNode; className?: string; header?: ReactNode }) {
  return (
    <section className={`doc-sheet relative rounded-md bg-sheet shadow-[0_1px_0_var(--color-rule),0_12px_32px_-18px_rgba(27,42,74,0.35)] ring-1 ring-rule ${className}`}>
      {header && <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-5 py-3 sm:px-8">{header}</div>}
      <div className="px-5 py-6 sm:px-10 sm:py-9">{children}</div>
    </section>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function Empty({ children, icon, title, action }: { children?: ReactNode; icon?: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-rule px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 [&_svg]:size-5">{icon}</div>}
      {title && <p className="font-semibold text-slate-900 dark:text-white">{title}</p>}
      {children && <div className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const tones = {
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  brand: "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  green: "bg-pass-soft text-pass",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  red: "bg-pen-soft text-pen",
};
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function scoreTone(score: number | null | undefined): Tone {
  if (score == null) return "slate";
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
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === o}
          key={String(o)}
          onClick={() => onChange(o)}
          className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${value === o ? "border-brand-900 bg-brand-900 text-white dark:border-brand-200 dark:bg-brand-200 dark:text-brand-950" : "border-rule bg-sheet text-slate-700 hover:border-slate-300 dark:text-slate-300"}`}
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
    <div className="space-y-2" aria-live="polite">
      {busy && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/60 dark:text-brand-200">
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-brand-700 dark:bg-brand-300" />
            </span>
            <span className="truncate">{status || "작업 중"}</span>
          </span>
          <button onClick={onStop} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-900">
            <Square className="size-3 fill-current" /> 중지
          </button>
        </div>
      )}
      {error && <p className="rounded-lg bg-pen-soft px-3 py-2 text-sm text-pen">{error}</p>}
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
      {done ? <Check /> : <Copy />}
      {done ? "복사했어요" : label}
    </Button>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "pen" | "pass" }) {
  const color = tone === "pen" ? "bg-pen" : tone === "pass" ? "bg-pass" : "bg-brand-700 dark:bg-brand-300";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-serif text-[26px] font-bold leading-tight tracking-tight text-brand-900 dark:text-white">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
