import "server-only";

const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
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
