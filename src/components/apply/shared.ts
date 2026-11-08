import type { Application, Doc, DocVersion, Profile } from "@/lib/types";
import { uid } from "@/lib/types";

export interface PanelProps {
  app: Application;
  profile: Profile;
  goTab: (tab: TabKey, extra?: Record<string, string>) => void;
}

export type TabKey = "overview" | "research" | "docs" | "evaluate" | "interview";

/** 본문과 "---" 아래 작성 메모/수정 내역을 나눠요. */
export function splitMemo(content: string): { body: string; memo: string } {
  const idx = content.search(/^---\s*$/m);
  if (idx < 0) return { body: content, memo: "" };
  return { body: content.slice(0, idx).trimEnd(), memo: content.slice(idx).replace(/^---\s*/, "").trim() };
}

/** 현재 내용이 마지막 버전과 다르면 새 버전으로 남겨요. 직접 수정이 연달아 생기면 하나로 합쳐요. */
export function withSnapshot(doc: Doc, note: string): Pick<Doc, "versions"> {
  const last = doc.versions[doc.versions.length - 1];
  if (!doc.content.trim() || last?.content === doc.content) return { versions: doc.versions };
  const v: DocVersion = { id: uid(), content: doc.content, at: Date.now(), note };
  if (note === "직접 수정" && last?.note === "직접 수정" && Date.now() - last.at < 10 * 60_000) {
    return { versions: [...doc.versions.slice(0, -1), v] };
  }
  return { versions: [...doc.versions, v].slice(-20) };
}

export function latestVersionId(doc: Doc): string | null {
  return doc.versions[doc.versions.length - 1]?.id ?? null;
}
