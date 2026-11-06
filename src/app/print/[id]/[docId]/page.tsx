"use client";
import { useParams } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { splitMemo } from "@/components/apply/shared";
import { useApp } from "@/lib/store";

export default function PrintPage() {
  const { id, docId } = useParams<{ id: string; docId: string }>();
  const app = useApp(id);
  const doc = app?.docs.find((d) => d.id === docId);
  if (!app || !doc) return <p className="p-10 text-sm text-slate-500">서류를 찾을 수 없어요.</p>;
  const { body } = splitMemo(doc.content);
  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4 text-sm text-slate-600">
        <span>{app.company} {doc.title}</span>
        <button onClick={() => window.print()} className="rounded-lg bg-brand-900 px-4 py-2 font-semibold text-white hover:bg-brand-800">
          인쇄 / PDF로 저장
        </button>
      </div>
      <article className="doc-sheet mx-auto max-w-[210mm] bg-white px-[18mm] py-[16mm] text-black shadow-sm print:shadow-none [&_.prose]:text-black">
        <Markdown>{body}</Markdown>
      </article>
    </div>
  );
}
