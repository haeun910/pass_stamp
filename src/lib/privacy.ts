/**
 * 주민등록번호처럼 서비스에 필요 없는 식별번호를 가려요.
 * 브라우저에서 보내기 전과 서버에서 Claude API로 보내기 전, 두 번 적용해요.
 * 전화번호와 이메일은 이력서에 필요해서 가리지 않아요.
 */

const PATTERNS: { re: RegExp; label: string }[] = [
  // 주민등록번호, 외국인등록번호: 생년월일 6자리 + 뒷자리 7자리 (첫 자리 1~8)
  { re: /\b\d{6}\s*-?\s*[1-8]\d{6}\b/g, label: "주민등록번호" },
  // 운전면허번호: 지역 2자리(또는 지역명) - 2자리 - 6자리 - 2자리
  { re: /\b(?:\d{2}|[가-힣]{2})\s*-\s*\d{2}\s*-\s*\d{6}\s*-\s*\d{2}\b/g, label: "운전면허번호" },
  // 여권번호: 영문 1~2자 + 숫자 7~8자리 (앞에 "여권" 표시가 있을 때만)
  { re: /(여권\s*(?:번호)?\s*[:：]?\s*)[A-Z]{1,2}\d{7,8}\b/g, label: "여권번호" },
  // 카드번호: 4-4-4-4
  { re: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g, label: "카드번호" },
];

export function maskSensitive(text: string): string {
  let out = text;
  for (const { re, label } of PATTERNS) {
    out = out.replace(re, (m, prefix?: string) => (typeof prefix === "string" && label === "여권번호" ? `${prefix}[${label} 삭제]` : `[${label} 삭제]`));
  }
  return out;
}

/** 입력에 가릴 번호가 있는지 (화면 경고용) */
export function findSensitive(text: string): string[] {
  const found = new Set<string>();
  for (const { re, label } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) found.add(label);
  }
  return [...found];
}
