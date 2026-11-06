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
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>비교 대상: {beforeLabel}</span>
        <span className="text-emerald-600">+{added}자</span>
        <span className="text-red-600">−{removed}자</span>
      </div>
      <div className="whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm leading-7 dark:bg-zinc-800/50">
        {parts.map((p, i) =>
          p.added ? (
            <ins key={i} className="rounded bg-emerald-100 px-0.5 text-emerald-900 no-underline dark:bg-emerald-900/50 dark:text-emerald-100">
              {p.value}
            </ins>
          ) : p.removed ? (
            <del key={i} className="rounded bg-red-100 px-0.5 text-red-800 dark:bg-red-900/40 dark:text-red-200">
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
