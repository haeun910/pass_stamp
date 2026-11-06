import { SITE } from "@/lib/site";

/** 브랜드 마크: 빨간 인장. 네모난 도장 안에 '합격'을 세로로 새겨요. */
export function Seal({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className={className}>
      <rect x="2" y="2" width="36" height="36" rx="7" fill="var(--color-pen)" />
      <rect x="5.5" y="5.5" width="29" height="29" rx="4.5" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.4" />
      <text x="20" y="18.2" textAnchor="middle" fontFamily="var(--font-serif)" fontWeight="700" fontSize="11" fill="#fff">
        합
      </text>
      <text x="20" y="30.2" textAnchor="middle" fontFamily="var(--font-serif)" fontWeight="700" fontSize="11" fill="#fff">
        격
      </text>
    </svg>
  );
}

export function Wordmark({ className = "", size = 30 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Seal size={size} />
      <span className="font-serif text-[1.15em] font-bold tracking-tight text-brand-900 dark:text-white">{SITE.name}</span>
    </span>
  );
}

/**
 * 점수 도장. 채점 결과에만 써요.
 * 기준(80점) 이상은 초록 '합격권', 아래는 빨간펜.
 */
export function ScoreStamp({
  score,
  size = 84,
  label,
  animate = false,
  rotate = -8,
}: {
  score: number | null | undefined;
  size?: number;
  label?: string;
  animate?: boolean;
  rotate?: number;
}) {
  if (score == null) return null;
  const pass = score >= 80;
  const color = pass ? "var(--color-pass)" : "var(--color-pen)";
  return (
    <div
      className={`relative inline-flex shrink-0 flex-col items-center justify-center rounded-full font-serif ${animate ? "stamp-animate" : ""}`}
      style={{
        width: size,
        height: size,
        color,
        border: `${Math.max(2, size / 28)}px solid ${color}`,
        boxShadow: `inset 0 0 0 ${Math.max(1.5, size / 40)}px var(--color-sheet), inset 0 0 0 ${Math.max(2.5, size / 26)}px ${color}`,
        transform: `rotate(${rotate}deg)`,
        ["--stamp-rot" as string]: `${rotate}deg`,
      }}
      role="img"
      aria-label={`${label ?? "점수"} ${score}점`}
    >
      <span className="font-bold leading-none tabular-nums" style={{ fontSize: size * 0.36 }}>
        {score}
      </span>
      <span className="mt-0.5 font-semibold" style={{ fontSize: Math.max(9, size * 0.13) }}>
        {label ?? (pass ? "합격권" : "보완 필요")}
      </span>
    </div>
  );
}
