"use client";
import { diffWords } from "diff";
import { useMemo } from "react";
import { stripMarkdown } from "@/lib/text";

/** 직전 버전과 지금 버전을 단어 단위로 비교해 보여줘요. */
export function DiffView({ before, after, beforeLabel }: { before: string; after: string; beforeLabel: string }) {
  const parts = useMemo(() => diffWords(stripMarkdown(before), stripMarkdown(after)), [before, after]);
  const added = parts.filter((p) => p.added).reduce((n, p) => n + p.value.trim().length, 0);
  const removed = parts.filter((p) => p.removed).reduce((n, p) => n + p.value.trim().length, 0);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>비교 대상: {beforeLabel}</span>
        <span className="font-semibold text-pass">+{added}자</span>
        <span className="font-semibold text-pen">−{removed}자</span>
      </div>
      <div className="whitespace-pre-wrap rounded-xl border border-rule bg-paper p-4 font-serif text-[15px] leading-8">
        {parts.map((p, i) =>
          p.added ? (
            <ins key={i} className="rounded-sm bg-pass-soft px-0.5 text-pass no-underline">
              {p.value}
            </ins>
          ) : p.removed ? (
            <del key={i} className="text-pen line-through decoration-pen decoration-2">
              {p.value}
            </del>
          ) : (
            <span key={i}>{p.value}</span>
          ),
        )}
      </div>
    </div>
  );
}
