import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { blankPattern } from "@/lib/text";

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: Record<string, unknown>;
}

const BLANK_CLASS = "rounded-sm bg-amber-100 px-0.5 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200";

/** 글 조각에서 [빈칸]만 <mark>로 감싸요. */
function splitBlanks(value: string): MdNode[] {
  const out: MdNode[] = [];
  let last = 0;
  for (const m of value.matchAll(blankPattern())) {
    if (!m[1].trim()) continue;
    const start = m.index ?? 0;
    if (start > last) out.push({ type: "text", value: value.slice(last, start) });
    out.push({
      type: "blank",
      data: { hName: "mark", hProperties: { className: BLANK_CLASS, title: "제출 전에 채우거나 지울 빈칸" } },
      children: [{ type: "text", value: m[0] }],
    });
    last = start + m[0].length;
  }
  if (last === 0) return [{ type: "text", value }];
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function markBlanks(node: MdNode) {
  if (!node.children || node.type === "link" || node.type === "linkReference") return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value) next.push(...splitBlanks(child.value));
    else {
      markBlanks(child);
      next.push(child);
    }
  }
  node.children = next;
}

/** 에이전트가 남긴 [빈칸]·[확인 필요: …]를 눈에 띄게 표시하는 remark 플러그인이에요. 코드 블록은 text 노드가 아니라 그대로 둬요. */
function remarkBlanks() {
  return (tree: MdNode) => markBlanks(tree);
}

export function Markdown({ children, highlightBlanks = false }: { children: string; highlightBlanks?: boolean }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h2:text-base prose-h3:text-[15px] prose-blockquote:border-brand-300 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-slate-600 prose-table:block prose-table:overflow-x-auto prose-table:text-[13px] prose-th:bg-slate-50 prose-th:px-2 prose-td:px-2 prose-a:text-brand-700 dark:prose-a:text-brand-300 dark:prose-blockquote:text-slate-300 dark:prose-th:bg-slate-800 print:prose-invert-0">
      <ReactMarkdown
        remarkPlugins={highlightBlanks ? [remarkGfm, remarkBreaks, remarkBlanks] : [remarkGfm, remarkBreaks]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
