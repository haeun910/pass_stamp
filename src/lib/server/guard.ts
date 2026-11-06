import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const hits = new Map<string, number[]>();

/** Vercel은 x-real-ip를 직접 채워요. 다른 프록시 뒤라면 그 프록시가 넣는 헤더를 확인해 주세요. */
export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

let lastPrune = 0;
function prune(now: number) {
  if (now - lastPrune < 600_000) return;
  lastPrune = now;
  for (const [ip, ts] of hits) if (!ts.some((t) => now - t < 3600_000)) hits.delete(ip);
}

/** 로그인이 없으니 배포 시 API 키 남용을 막는 최소한의 장치예요. */
export function guard(req: Request): Response | null {
  const code = process.env.APP_ACCESS_CODE;
  if (code && req.headers.get("x-access-code") !== code) {
    return Response.json({ error: "접근 코드가 필요해요. 설정에서 접근 코드를 입력해 주세요." }, { status: 401 });
  }
  const limit = Number(process.env.RATE_LIMIT_PER_HOUR ?? 200);
  if (limit > 0) {
    const ip = clientIp(req);
    const now = Date.now();
    prune(now);
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
    if (recent.length >= limit) {
      return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
    }
    recent.push(now);
    hits.set(ip, recent);
  }
  return null;
}

export function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function isMock() {
  return process.env.AGENT_MOCK === "1" || (process.env.NODE_ENV !== "production" && !hasCredentials() && process.env.AGENT_MOCK !== "0");
}

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

/** Claude API 오류를 사용자에게 보여줄 문장으로 바꿔요. 원문은 서버 로그에만 남겨요. */
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "서버의 API 키가 올바르지 않아요. 운영자에게 알려 주세요.";
  if (err instanceof Anthropic.PermissionDeniedError) return "이 API 키로는 해당 모델을 쓸 수 없어요. 운영자에게 알려 주세요.";
  if (err instanceof Anthropic.RateLimitError) return "지금 사용자가 많아요. 1~2분 뒤 다시 시도해 주세요.";
  if (err instanceof Anthropic.BadRequestError) {
    console.error("[claude] bad request", err.message);
    return "요청을 처리하지 못했어요. 입력이 너무 길거나 형식이 맞지 않을 수 있어요.";
  }
  if (err instanceof Anthropic.InternalServerError) return "Claude API가 잠시 불안정해요. 잠시 후 다시 시도해 주세요.";
  if (err instanceof Anthropic.APIConnectionError) return "Claude API에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.";
  if (err instanceof Error && err.message.includes("authentication method")) return "서버에 ANTHROPIC_API_KEY가 설정되지 않았어요.";
  console.error("[claude] unexpected", err);
  return "알 수 없는 오류가 났어요. 잠시 후 다시 시도해 주세요.";
}
