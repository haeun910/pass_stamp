import type { AgentContext, AgentId } from "./agents";
import type { ChatMessage } from "./store";

export async function runAgent(
  agent: AgentId,
  context: AgentContext,
  opts: { instruction?: string; messages?: ChatMessage[] },
  onText: (full: string) => void,
): Promise<string> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent, context, ...opts }),
  });
  if (!res.ok || !res.body) throw new Error(`요청 실패 (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onText(full);
  }
  return full;
}
