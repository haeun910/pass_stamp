import Anthropic from "@anthropic-ai/sdk";
import { AGENTS, AgentId, AgentContext, buildContextBlock } from "@/lib/agents";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";
const client = new Anthropic();

interface Body {
  agent: AgentId;
  context: AgentContext;
  messages?: { role: "user" | "assistant"; content: string }[];
  instruction?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const agent = AGENTS[body.agent];
  if (!agent) return new Response("unknown agent", { status: 400 });

  const contextBlock = buildContextBlock(body.context ?? {});
  const system = `${agent.system}\n\n# 참고 자료\n${contextBlock || "(없음)"}`;

  const messages: Anthropic.Beta.BetaMessageParam[] =
    body.messages && body.messages.length > 0
      ? body.messages.map((m) => ({ role: m.role, content: m.content }))
      : [{ role: "user", content: body.instruction ?? "시작해 주세요." }];

  const tools: Anthropic.Beta.BetaToolUnion[] = agent.webSearch
    ? [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }]
    : [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (t: string) => controller.enqueue(encoder.encode(t));
      try {
        // Server tools (web search) can pause a long turn; continue up to a few times.
        for (let i = 0; i < 5; i++) {
          const s = client.beta.messages.stream({
            model: MODEL,
            max_tokens: 32000,
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            output_config: { effort: agent.effort },
            system,
            messages,
            ...(tools.length ? { tools } : {}),
          });
          for await (const ev of s) {
            if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
              write(ev.delta.text);
            }
          }
          const final = await s.finalMessage();
          if (final.stop_reason === "refusal") {
            write("\n\n> 요청을 처리할 수 없었어요. 입력 내용을 바꿔서 다시 시도해 주세요.");
            break;
          }
          if (final.stop_reason !== "pause_turn") break;
          messages.push({ role: "assistant", content: final.content as Anthropic.Beta.BetaContentBlockParam[] });
        }
      } catch (err) {
        const msg =
          err instanceof Anthropic.AuthenticationError ||
          (err instanceof Error && err.message.includes("authentication method"))
            ? "ANTHROPIC_API_KEY가 설정되지 않았거나 올바르지 않아요."
            : err instanceof Anthropic.RateLimitError
              ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
              : err instanceof Error
                ? err.message
                : String(err);
        write(`\n\n> 오류: ${msg}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
