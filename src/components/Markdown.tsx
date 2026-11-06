import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-table:text-sm prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800 prose-a:text-indigo-600">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
