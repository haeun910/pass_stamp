export type DocType = "자기소개서" | "이력서" | "경력기술서" | "포트폴리오";
export const DOC_TYPES: DocType[] = ["자기소개서", "이력서", "경력기술서", "포트폴리오"];

export type AppStatus = "준비 중" | "서류 제출" | "서류 합격" | "면접 진행" | "최종 합격" | "불합격";
export const APP_STATUSES: AppStatus[] = ["준비 중", "서류 제출", "서류 합격", "면접 진행", "최종 합격", "불합격"];

export interface Profile {
  name: string;
  headline: string; // 한 줄 소개, 희망 직무
  contact: string; // 이메일, 전화, 링크
  education: string;
  experience: string; // 경력, 인턴
  projects: string;
  skills: string;
  certificates: string; // 자격증, 어학
  awards: string; // 수상, 대외활동
  extra: string; // 가치관, 강점, 기타 에피소드
}

export const PROFILE_SECTIONS: { key: keyof Profile; label: string; hint: string; rows: number }[] = [
  { key: "name", label: "이름", hint: "", rows: 1 },
  { key: "headline", label: "희망 직무 / 한 줄 소개", hint: "예: 3년 차 프론트엔드 개발자, 결제 UX 개선에 관심", rows: 1 },
  { key: "contact", label: "연락처와 링크", hint: "이메일, 전화번호, GitHub, 블로그, 포트폴리오 링크", rows: 2 },
  { key: "education", label: "학력", hint: "학교, 전공, 기간, 학점, 관련 수업이나 졸업 프로젝트", rows: 3 },
  { key: "experience", label: "경력 / 인턴", hint: "회사, 기간, 역할, 한 일과 결과를 숫자로 (예: 전환율 12% 개선)", rows: 6 },
  { key: "projects", label: "프로젝트", hint: "프로젝트마다 문제, 내 역할, 해결 방법, 성과, 사용 기술", rows: 6 },
  { key: "skills", label: "기술 / 역량", hint: "언어, 도구, 협업 방식 등", rows: 3 },
  { key: "certificates", label: "자격증 / 어학", hint: "예: 정보처리기사, TOEIC 900, OPIc IH", rows: 2 },
  { key: "awards", label: "수상 / 대외활동", hint: "공모전, 동아리, 봉사, 교환학생 등", rows: 3 },
  { key: "extra", label: "나를 보여주는 에피소드", hint: "갈등 해결, 실패와 극복, 리더십, 가치관 등 자소서에 쓸 만한 경험", rows: 5 },
];

export interface DocQuestion {
  id: string;
  question: string;
  limit: number | null; // 글자 수 제한 (공백 포함)
}

export interface DocVersion {
  id: string;
  content: string;
  at: number;
  note: string; // "초안", "피드백 반영", "직접 수정" 등
}

export interface Evaluation {
  id: string;
  versionId: string;
  content: string;
  score: number | null;
  at: number;
}

export interface Doc {
  id: string;
  type: DocType;
  title: string;
  questions: DocQuestion[];
  request: string;
  content: string;
  versions: DocVersion[];
  evaluations: Evaluation[];
  updatedAt: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  at?: number;
  seconds?: number; // 답변에 걸린 시간
}

export interface InterviewSettings {
  mode: string;
  questionCount: number;
  difficulty: "기본" | "심화" | "압박";
  answerSeconds: number; // 0 = 제한 없음
  voice: boolean;
}

export interface InterviewSession {
  id: string;
  settings: InterviewSettings;
  messages: ChatMessage[];
  report: string;
  score: number | null;
  startedAt: number;
  endedAt: number | null;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  jobUrl: string;
  jobPosting: string;
  deadline: string; // YYYY-MM-DD
  status: AppStatus;
  memo: string;
  companyProfile: string;
  researchedAt: number | null;
  docs: Doc[];
  questionBank: string;
  interviews: InterviewSession[];
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  version: 2;
  profile: Profile;
  applications: Application[];
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const emptyProfile = (): Profile => ({
  name: "",
  headline: "",
  contact: "",
  education: "",
  experience: "",
  projects: "",
  skills: "",
  certificates: "",
  awards: "",
  extra: "",
});

export const defaultInterviewSettings = (): InterviewSettings => ({
  mode: "직무 + 인성 종합",
  questionCount: 7,
  difficulty: "기본",
  answerSeconds: 90,
  voice: false,
});

export function newDoc(type: DocType): Doc {
  return {
    id: uid(),
    type,
    title: type,
    questions:
      type === "자기소개서"
        ? [
            { id: uid(), question: "지원 동기와 입사 후 포부를 작성해 주세요.", limit: 700 },
            { id: uid(), question: "직무 역량을 키우기 위해 노력한 경험을 작성해 주세요.", limit: 700 },
          ]
        : [],
    request: "",
    content: "",
    versions: [],
    evaluations: [],
    updatedAt: Date.now(),
  };
}

export function newApplication(): Application {
  const now = Date.now();
  return {
    id: uid(),
    company: "",
    role: "",
    jobUrl: "",
    jobPosting: "",
    deadline: "",
    status: "준비 중",
    memo: "",
    companyProfile: "",
    researchedAt: null,
    docs: [],
    questionBank: "",
    interviews: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** 에이전트에 보낼 프로필 글. 연락처는 이력서·경력기술서를 쓸 때만 필요해서 기본으로는 빼요 (개인정보 최소 전송). */
export function profileToText(p: Profile, opts: { includeContact?: boolean } = {}): string {
  return PROFILE_SECTIONS.filter((s) => p[s.key]?.trim() && (opts.includeContact || s.key !== "contact"))
    .map((s) => `[${s.label}]\n${p[s.key].trim()}`)
    .join("\n\n");
}

export function profileFilled(p: Profile): number {
  const keys = PROFILE_SECTIONS.map((s) => s.key).filter((k) => k !== "name" && k !== "contact");
  return keys.filter((k) => p[k].trim().length > 0).length / keys.length;
}
