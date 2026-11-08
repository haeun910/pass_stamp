/** 서비스 이름, 사업자 정보, 요금제를 한 곳에서 바꿔요. */
export const SITE = {
  /** 배포 주소. sitemap, robots, 공유 이미지 링크에 써요. Vercel 환경 변수 NEXT_PUBLIC_SITE_URL로 바꿔요. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  name: "합격도장",
  englishName: "Hapgyeok Dojang",
  tagline: "지원하는 회사의 기준으로 서류를 고치고, 그 회사 면접관과 연습해요.",
  description: "회사 리서치, 맞춤 자기소개서·이력서, 회사 기준 채점과 첨삭, 꼬리질문 모의 면접까지 한 곳에서.",
  supportEmail: "help@example.com",
  // 전자상거래법에 따라 사이트 하단에 표시해야 하는 정보예요. 출시 전에 꼭 채워 주세요.
  business: {
    company: "[상호]",
    ceo: "[대표자]",
    registrationNumber: "[사업자등록번호]",
    mailOrderNumber: "[통신판매업 신고번호]",
    address: "[사업장 주소]",
    phone: "[고객센터 전화번호]",
  },
};

export interface Plan {
  id: string;
  name: string;
  price: number; // 원, 월 기준 (0 = 무료)
  period: string;
  summary: string;
  features: string[];
  limits: { companies: number; interviews: number };
  highlight?: boolean;
}

// 가격과 한도는 예시예요. Claude API 원가(README의 "비용 추정")를 보고 정해 주세요.
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "체험",
    price: 0,
    period: "",
    summary: "한 회사로 전 과정을 끝까지 써 보세요.",
    features: ["회사 리서치 1곳", "서류 작성·첨삭 3회", "모의 면접 1회", "예상 질문 1회"],
    limits: { companies: 1, interviews: 1 },
  },
  {
    id: "standard",
    name: "스탠다드",
    price: 14900,
    period: "월",
    summary: "상반기·하반기 공채를 준비할 때.",
    features: ["회사 리서치 월 5곳", "서류 작성·첨삭 무제한*", "모의 면접 월 10회", "음성 면접, 버전 비교, PDF 저장"],
    limits: { companies: 5, interviews: 10 },
    highlight: true,
  },
  {
    id: "pro",
    name: "프로",
    price: 29900,
    period: "월",
    summary: "여러 회사에 동시에 지원할 때.",
    features: ["회사 리서치 월 15곳", "서류 작성·첨삭 무제한*", "모의 면접 월 30회", "압박 면접, 임원 면접 모드"],
    limits: { companies: 15, interviews: 30 },
  },
];

export const won = (n: number) => (n === 0 ? "무료" : `${n.toLocaleString("ko-KR")}원`);
