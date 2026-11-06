import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-h2:mt-6 prose-h2:text-base prose-h3:text-[15px] prose-blockquote:border-indigo-300 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-zinc-600 prose-table:block prose-table:overflow-x-auto prose-table:text-[13px] prose-th:bg-zinc-50 prose-th:px-2 prose-td:px-2 prose-a:text-indigo-600 dark:prose-blockquote:text-zinc-300 dark:prose-th:bg-zinc-800 print:prose-invert-0">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{ a: (p) => <a {...p} target="_blank" rel="noreferrer" /> }}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
