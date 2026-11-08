import { clientIp, codeMatches, hasCredentials, isMock } from "@/lib/server/guard";

// 접근 코드 확인 결과를 돌려주는 곳이라, 코드를 추측하는 데 쓰이지 않게 IP당 시간당 횟수를 제한해요.
const checks = new Map<string, number[]>();
const LIMIT = 120;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (checks.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= LIMIT) return Response.json({ error: "요청이 너무 많아요." }, { status: 429 });
  recent.push(now);
  checks.set(ip, recent);
  return Response.json({
    hasKey: hasCredentials(),
    mock: isMock(),
    needsCode: Boolean(process.env.APP_ACCESS_CODE),
    codeOk: codeMatches(req),
  });
}
