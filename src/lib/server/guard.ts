import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ModelTier } from "@/lib/agents";
import { getViewer } from "./auth";
import { authEnabled, authRequired } from "./auth-env";

/**
 * 사람(로그인했으면 계정, 아니면 IP)별 요청 기록. 서버 인스턴스마다 따로 세는 메모리 방식이라,
 * Vercel처럼 인스턴스가 여러 개인 환경에서는 느슨한 안전장치예요. 진짜 문지기는 로그인과 관리자 승인이에요.
 */
const hits = new Map<string, number[]>();
const HOUR = 3600_000;

/** Vercel은 x-real-ip를 직접 채워요. 다른 프록시 뒤라면 그 프록시가 넣는 헤더를 확인해 주세요. */
export function clientIp(req: Request): string {
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

let lastPrune = 0;
function prune(now: number) {
  if (now - lastPrune < 600_000) return;
  lastPrune = now;
  for (const [key, ts] of hits) if (!ts.some((t) => now - t < HOUR)) hits.delete(key);
}

/** 한 시간 창 안의 기록 수를 세고, 한도 안이면 지금 시각을 더해요. */
function count(key: string, limit: number, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function rateLimit(): number {
  return Number(process.env.RATE_LIMIT_PER_HOUR ?? 60);
}

/** 요청을 통과시킨 사람. 로그인을 안 쓰는 로컬 개발에서는 userId가 null이에요. */
export interface Access {
  userId: string | null;
}

/**
 * AI 기능(비용이 드는 요청) 앞에서 확인해요.
 * 로그인했고 관리자가 승인한 계정만 통과하고, 계정마다 시간당 요청 수를 제한해요.
 * 프로덕션에서 로그인 설정이 빠져 있으면 모두 막아요(운영자의 API 비용 보호).
 */
export async function guard(req: Request): Promise<Response | Access> {
  const now = Date.now();
  prune(now);
  let userId: string | null = null;
  if (authRequired()) {
    if (!authEnabled()) {
      console.error("[auth] 프로덕션인데 DATABASE_URL이나 BETTER_AUTH_SECRET이 없어 AI 요청을 막았어요.");
      return Response.json({ error: "로그인 설정이 아직 끝나지 않았어요. 운영자에게 알려 주세요." }, { status: 503 });
    }
    const viewer = await getViewer(req.headers).catch((e) => {
      console.error("[auth] 세션 확인 실패", e);
      return undefined;
    });
    if (viewer === undefined) return Response.json({ error: "로그인 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    if (!viewer) return Response.json({ error: "로그인이 필요해요. 다시 로그인해 주세요." }, { status: 401 });
    if (viewer.status === "blocked") return Response.json({ error: "이용이 중지된 계정이에요." }, { status: 403 });
    if (viewer.status !== "approved") return Response.json({ error: "이용 승인을 기다리고 있어요. 승인되면 바로 쓸 수 있어요." }, { status: 403 });
    userId = viewer.id;
  }
  const limit = rateLimit();
  if (limit > 0 && !count(userId ? `u:${userId}` : `ip:${clientIp(req)}`, limit, now)) {
    return Response.json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  }
  return { userId };
}

export function hasCredentials() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function isMock() {
  return process.env.AGENT_MOCK === "1" || (process.env.NODE_ENV !== "production" && !hasCredentials() && process.env.AGENT_MOCK !== "0");
}

const MODEL_IDS: Record<ModelTier, string> = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
};

/** 작업에 쓸 모델 이름. CLAUDE_MODEL을 넣으면 모든 작업을 그 모델 하나로 고정해요(문제가 생겼을 때 되돌리는 용도). */
export function modelFor(tier: ModelTier): string {
  return process.env.CLAUDE_MODEL?.trim() || MODEL_IDS[tier];
}

/** 거절된 요청을 서버가 다른 모델로 다시 시도하는 기능(fallbacks)은 Haiku에 없어요. Haiku에 보내면 400이 나요. */
export function supportsServerFallback(model: string): boolean {
  return !model.startsWith("claude-haiku");
}

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
