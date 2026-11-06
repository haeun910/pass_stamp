import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, AGENT_IDS, AgentContext, AgentId, CONTEXT_LABELS, buildContextBlock } from "@/lib/agents";
import { MODEL, guard, isMock } from "@/lib/server/guard";
import { mockStream } from "@/lib/server/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FIELD = 40_000;
const MAX_MESSAGES = 80;
const MAX_MESSAGE = 10_000;

interface Body {
  agent: AgentId;
  context?: AgentContext;
  messages?: { role: "user" | "assistant"; content: string }[];
  instruction?: string;
}

/** 스트림 한 줄 = JSON 이벤트 하나 (NDJSON) */
export type StreamEvent =
  | { type: "status"; text: string }
  | { type: "text"; text: string }
  | { type: "notice"; text: string }
  | { type: "error"; text: string };

function validate(body: Body): string | null {
  if (!AGENT_IDS.includes(body.agent)) return "알 수 없는 에이전트예요.";
  for (const [k, v] of Object.entries(body.context ?? {})) {
    if (!(k in CONTEXT_LABELS)) return `알 수 없는 항목: ${k}`;
    if (typeof v !== "string" || v.length > MAX_FIELD) return `${k} 내용이 너무 길어요 (최대 ${MAX_FIELD.toLocaleString()}자).`;
  }
  const msgs = body.messages ?? [];
  if (msgs.length > MAX_MESSAGES) return "대화가 너무 길어요. 새 면접을 시작해 주세요.";
  for (const m of msgs) {
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string" || m.content.length > MAX_MESSAGE)
      return "메시지 형식이 올바르지 않거나 너무 길어요.";
  }
  if (body.instruction && body.instruction.length > MAX_MESSAGE) return "요청이 너무 길어요.";
  return null;
}

function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "API 키가 올바르지 않아요. 서버의 ANTHROPIC_API_KEY를 확인해 주세요.";
  if (err instanceof Anthropic.PermissionDeniedError) return "이 API 키로는 해당 모델을 쓸 수 없어요.";
  if (err instanceof Anthropic.RateLimitError) return "Claude API 사용량 한도에 걸렸어요. 1~2분 뒤 다시 시도해 주세요.";
  if (err instanceof Anthropic.BadRequestError) return `요청 형식 오류: ${err.message}`;
  if (err instanceof Anthropic.InternalServerError) return "Claude API가 일시적으로 불안정해요. 잠시 후 다시 시도해 주세요.";
  if (err instanceof Anthropic.APIConnectionError) return "Claude API에 연결하지 못했어요. 네트워크를 확인해 주세요.";
  if (err instanceof Error && err.message.includes("authentication method"))
    return "서버에 ANTHROPIC_API_KEY가 설정되지 않았어요. .env.local에 키를 넣고 서버를 다시 시작해 주세요.";
  return err instanceof Error ? err.message : String(err);
}

export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "잘못된 요청이에요." }, { status: 400 });
  }
  const invalid = validate(body);
  if (invalid) return Response.json({ error: invalid }, { status: 400 });

  const agent = AGENTS[body.agent];
  const messages: Anthropic.Beta.BetaMessageParam[] =
    body.messages && body.messages.length > 0
      ? body.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: body.instruction?.trim() || "시작해 주세요." }];
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = typeof lastUser?.content === "string" ? lastUser.content : "";

  const tools: Anthropic.Beta.BetaToolUnion[] = [];
  if (agent.tools?.includes("web_search")) tools.push({ type: "web_search_20260209", name: "web_search", max_uses: 10 });
  if (agent.tools?.includes("web_fetch")) tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: 5 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (ev: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
        } catch {}
      };
      try {
        if (isMock()) {
          for await (const ev of mockStream(body.agent, lastUserText, messages.length)) {
            if (req.signal.aborted) break;
            send(ev as StreamEvent);
          }
          return;
        }

        const client = new Anthropic();
        // 리서치처럼 서버 도구를 오래 쓰면 pause_turn으로 끊길 수 있어 몇 번 이어서 요청해요.
        for (let round = 0; round < 6; round++) {
          const s = client.beta.messages.stream(
            {
              model: MODEL,
              max_tokens: agent.maxTokens,
              betas: ["server-side-fallback-2026-07-01"],
              fallbacks: "default",
              output_config: { effort: agent.effort },
              cache_control: { type: "ephemeral" },
              system: [
                { type: "text", text: agent.system },
                { type: "text", text: buildContextBlock(body.context ?? {}) },
              ],
              messages,
              ...(tools.length ? { tools } : {}),
            },
            { signal: req.signal },
          );

          const toolInputs = new Map<number, { name: string; json: string }>();
          for await (const ev of s) {
            if (ev.type === "content_block_start") {
              const b = ev.content_block;
              if (b.type === "thinking") send({ type: "status", text: "생각하는 중" });
              else if (b.type === "server_tool_use") toolInputs.set(ev.index, { name: b.name, json: "" });
              else if (b.type === "web_search_tool_result") send({ type: "status", text: "검색 결과 읽는 중" });
              else if (b.type === "web_fetch_tool_result") send({ type: "status", text: "페이지 내용 정리 중" });
              else if (b.type === "text") send({ type: "status", text: "작성 중" });
            } else if (ev.type === "content_block_delta") {
              if (ev.delta.type === "text_delta") send({ type: "text", text: ev.delta.text });
              else if (ev.delta.type === "input_json_delta") {
                const t = toolInputs.get(ev.index);
                if (t) t.json += ev.delta.partial_json;
              }
            } else if (ev.type === "content_block_stop") {
              const t = toolInputs.get(ev.index);
              if (t) {
                let input: { query?: string; url?: string } = {};
                try {
                  input = JSON.parse(t.json || "{}");
                } catch {}
                if (t.name === "web_search") send({ type: "status", text: `"${input.query ?? ""}" 검색 중` });
                else if (t.name === "web_fetch") send({ type: "status", text: `페이지 읽는 중: ${input.url ?? ""}` });
                else send({ type: "status", text: "도구 사용 중" });
              }
            }
          }

          const final = await s.finalMessage();
          if (final.stop_reason === "refusal") {
            send({ type: "notice", text: "이 요청은 처리할 수 없었어요. 입력 내용을 조금 바꿔서 다시 시도해 주세요." });
            break;
          }
          if (final.stop_reason === "max_tokens") {
            send({ type: "notice", text: "답변이 길어서 중간에 끊겼어요. 요청을 나눠서 다시 시도해 주세요." });
            break;
          }
          if (final.stop_reason !== "pause_turn") break;
          messages.push({ role: "assistant", content: final.content as Anthropic.Beta.BetaContentBlockParam[] });
        }
      } catch (err) {
        if (req.signal.aborted) return;
        send({ type: "error", text: friendlyError(err) });
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
