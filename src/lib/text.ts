/** 한국 자소서 기준 글자 수: 공백 포함 / 공백 제외 (줄바꿈은 공백으로 취급) */
export function countChars(text: string) {
  const t = text.replace(/\r/g, "").trim();
  return { withSpaces: [...t.replace(/\n/g, " ")].length, withoutSpaces: [...t.replace(/\s/g, "")].length };
}

/** "### 1. 문항" 형식으로 나뉜 자소서 답변을 문항별로 잘라요. */
export function splitAnswers(content: string): { index: number; heading: string; body: string }[] {
  const re = /^#{2,4}\s*(\d+)[.)]\s*(.*)$/gm;
  const marks: { index: number; heading: string; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) marks.push({ index: Number(m[1]), heading: m[2], start: m.index, end: re.lastIndex });
  return marks.map((mk, i) => {
    let body = content.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : content.length);
    // 마지막 문항 뒤에 붙는 "보완하면 좋은 점" 같은 부록은 글자 수에서 빼요.
    body = body.split(/^---\s*$|^#{1,4}\s*(보완|참고|작성 메모)/m)[0];
    // 소제목(**제목**) 한 줄은 본문에 포함해요. 글자 수 표기 줄은 빼요.
    body = body.replace(/^\s*\(?\s*(글자 ?수|공백 포함)[^\n]*$/gm, "");
    return { index: mk.index, heading: mk.heading.trim(), body: body.trim() };
  });
}

export function parseScore(markdown: string): number | null {
  const m = markdown.match(/종합\s*(?:점수|평가)[^\d\n]{0,12}(\d{1,3})\s*(?:\/|점)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 100 ? n : null;
}

export function dDay(deadline: string): { label: string; tone: "past" | "urgent" | "soon" | "normal" } | null {
  if (!deadline) return null;
  const end = new Date(deadline + "T23:59:59");
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((end.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: "마감", tone: "past" };
  if (days === 0) return { label: "D-day", tone: "urgent" };
  return { label: `D-${days}`, tone: days <= 3 ? "urgent" : days <= 7 ? "soon" : "normal" };
}

export function formatDate(ts: number | null | undefined, withTime = true): string {
  if (!ts) return "";
  const d = new Date(ts);
  const date = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return withTime ? `${date} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : date;
}

export function relativeTime(ts: number | null | undefined): string {
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return formatDate(ts, false);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ");
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function todayStringSafe() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
