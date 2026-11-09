import "server-only";

/** 요청 한 번의 원가를 서버 로그에 남겨요. 요금과 한도를 실측으로 정하기 위한 기록이라 입력 내용은 남기지 않아요. */

// Claude Opus 5.5 정가 (달러 / 100만 토큰). 모델이나 가격이 바뀌면 여기만 고쳐요.
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2, webSearchPerCall: 0.01 };
const KRW_PER_USD = Number(process.env.KRW_PER_USD ?? 1400);

export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null; web_fetch_requests?: number | null } | null;
}

export interface UsageTotals {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  webSearch: number;
  webFetch: number;
}

export function emptyUsage(): UsageTotals {
  return { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, webSearch: 0, webFetch: 0 };
}

export function addUsage(t: UsageTotals, u: UsageLike | null | undefined): UsageTotals {
  if (!u) return t;
  t.input += u.input_tokens ?? 0;
  t.output += u.output_tokens ?? 0;
  t.cacheWrite += u.cache_creation_input_tokens ?? 0;
  t.cacheRead += u.cache_read_input_tokens ?? 0;
  t.webSearch += u.server_tool_use?.web_search_requests ?? 0;
  t.webFetch += u.server_tool_use?.web_fetch_requests ?? 0;
  return t;
}

/** 스트림 중간에 받은 사용량을 합쳐요. message_delta의 값은 누적값이라 덮어쓰고, 비어 있는 값은 무시해요. */
export function mergeUsage(base: UsageLike | null, next: UsageLike | null | undefined): UsageLike | null {
  if (!next) return base;
  const merged: UsageLike = { ...(base ?? {}) };
  for (const [k, v] of Object.entries(next) as [keyof UsageLike, UsageLike[keyof UsageLike]][]) {
    if (v != null) (merged as Record<string, unknown>)[k] = v;
  }
  return merged;
}

export function costUsd(t: UsageTotals): number {
  return (
    (t.input * PRICE.input + t.output * PRICE.output + t.cacheWrite * PRICE.cacheWrite + t.cacheRead * PRICE.cacheRead) / 1_000_000 +
    t.webSearch * PRICE.webSearchPerCall
  );
}

/** 한 줄 JSON으로 남겨서 Vercel 로그에서 `[usage]`로 검색하고 합산하기 쉽게 해요. */
export function logUsage(task: string, model: string, t: UsageTotals, extra: Record<string, unknown> = {}) {
  const usd = costUsd(t);
  console.info(`[usage] ${JSON.stringify({ task, model, ...t, usd: Number(usd.toFixed(4)), krw: Math.round(usd * KRW_PER_USD), ...extra })}`);
}
