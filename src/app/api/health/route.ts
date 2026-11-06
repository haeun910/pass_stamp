import { hasCredentials, isMock } from "@/lib/server/guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const code = process.env.APP_ACCESS_CODE;
  return Response.json({
    hasKey: hasCredentials(),
    mock: isMock(),
    needsCode: Boolean(code),
    codeOk: !code || req.headers.get("x-access-code") === code,
  });
}
