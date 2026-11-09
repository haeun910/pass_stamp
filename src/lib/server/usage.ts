import "server-only";

/** 요청 한 번의 원가를 서버 로그에 남겨요. 요금과 한도를 실측으로 정하기 위한 기록이라 입력 내용은 남기지 않아요. */

// 정가 (달러 / 100만 토큰, 캐시 쓰기는 5분 캐시). 모델이나 가격이 바뀌면 여기만 고쳐요.
interface Price {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
  /** 한 요청의 입력(캐시 포함)이 이 토큰 수를 넘으면 모든 단가에 factor를 곱해요. */
  longPrompt?: { over: number; factor: number };
}
const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  // Haiku 5.5는 입력이 10만 토큰을 넘는 요청에 다른 요금표($0.50 / $2.50)를 써요.
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01, longPrompt: { over: 100_000, factor: 5 } },
};
const FAMILY_FALLBACK: [string, string][] = [
  ["claude-opus", "claude-opus-5-5"],
  ["claude-sonnet", "claude-sonnet-5-5"],
  ["claude-haiku", "claude-haiku-5-5"],
];
const WEB_SEARCH_PER_CALL = 0.01;
const KRW_PER_USD = Number(process.env.KRW_PER_USD ?? 1400);

/**
 * 모델의 단가. 표에 없는 모델(서버가 거절 요청을 다른 모델로 다시 시도한 경우 등)은 같은 계열 값으로 어림하고
 * exact: false로 알려요. 계열도 모르면 가장 비싼 Opus 값으로 잡아 원가를 적게 보지 않게 해요.
 */
function priceFor(model: string): { price: Price; exact: boolean } {
  if (PRICES[model]) return { price: PRICES[model], exact: true };
  const family = FAMILY_FALLBACK.find(([prefix]) => model.startsWith(prefix));
  return { price: PRICES[family?.[1] ?? "claude-opus-5-5"], exact: false };
}

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
  /** 요청마다 그 요청의 모델 단가로 계산해 더한 원가(달러). */
  usd: number;
  /** 단가표에 없는 모델이 섞여 원가가 어림값이면 false. */
  priceExact: boolean;
}

export function emptyUsage(): UsageTotals {
  return { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, webSearch: 0, webFetch: 0, usd: 0, priceExact: true };
}

/** 요청 한 번의 사용량을 더해요. 원가는 그 요청을 처리한 모델의 단가로 계산해요. */
export function addUsage(t: UsageTotals, u: UsageLike | null | undefined, model: string): UsageTotals {
  if (!u) return t;
  const input = u.input_tokens ?? 0;
  const output = u.output_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const webSearch = u.server_tool_use?.web_search_requests ?? 0;
  t.input += input;
  t.output += output;
  t.cacheWrite += cacheWrite;
  t.cacheRead += cacheRead;
  t.webSearch += webSearch;
  t.webFetch += u.server_tool_use?.web_fetch_requests ?? 0;

  const { price, exact } = priceFor(model);
  const factor = price.longPrompt && input + cacheWrite + cacheRead > price.longPrompt.over ? price.longPrompt.factor : 1;
  t.usd +=
    ((input * price.input + output * price.output + cacheWrite * price.cacheWrite + cacheRead * price.cacheRead) * factor) / 1_000_000 +
    webSearch * WEB_SEARCH_PER_CALL;
  if (!exact) t.priceExact = false;
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

/** 한 줄 JSON으로 남겨서 Vercel 로그에서 `[usage]`로 검색하고 합산하기 쉽게 해요. */
export function logUsage(task: string, model: string, t: UsageTotals, extra: Record<string, unknown> = {}) {
  console.info(`[usage] ${JSON.stringify({ task, model, ...t, usd: Number(t.usd.toFixed(4)), krw: Math.round(t.usd * KRW_PER_USD), ...extra })}`);
}
