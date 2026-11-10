import { Eye, FileText, Mic, PenLine, Search, Timer } from "lucide-react";
import Link from "next/link";
import { ScoreStamp } from "@/components/brand";
import { BetaAccess } from "@/components/marketing/BetaAccess";
import { HeroSheet } from "@/components/marketing/HeroSheet";
import { Pricing } from "@/components/marketing/Pricing";
import { DEMO_APP_ID } from "@/lib/demo-id";
import { SITE } from "@/lib/site";

const STEPS = [
  { title: "회사 리서치", body: "채용공고와 웹을 읽고 인재상, 최근 이슈, 직무 요건, 평가 기준을 정리해요." },
  { title: "맞춤 서류", body: "내 프로필에 있는 경험만으로 자기소개서, 이력서, 포트폴리오를 써요." },
  { title: "회사 기준 채점", body: "그 회사 평가관처럼 점수를 매기고, 고칠 문장마다 수정안을 줘요." },
  { title: "모의 면접", body: "서류를 읽은 면접관이 꼬리질문까지 하고, 끝나면 질문별 피드백을 줘요." },
];

const FAQ = [
  {
    q: "AI가 없는 경험을 지어내지 않나요?",
    a: "내 프로필에 없는 경험, 수치, 수상은 쓰지 않아요. 필요한데 정보가 없으면 [성과 수치 입력]처럼 빈칸으로 남기고, 무엇을 채우면 좋을지 따로 알려드려요. 평가 단계에서도 근거 없는 주장을 따로 짚어요.",
  },
  {
    q: "어떤 회사든 준비할 수 있나요?",
    a: "공개된 정보가 있는 회사라면 대부분 가능해요. 채용공고 링크를 넣으면 공고를 직접 읽고, 링크를 읽을 수 없을 때는 공고 내용을 붙여넣으면 돼요. 정보가 적은 회사는 같은 업계 기준으로 추정하고 추정이라고 표시해요.",
  },
  {
    q: "내 서류와 정보는 어디에 저장되나요?",
    a: "로그인 정보(이름, 이메일)만 회원 관리를 위해 서버에 저장해요. 프로필, 서류, 면접 기록은 지금 쓰는 브라우저에 계정별로 저장되고 서버에는 보관하지 않아요. 에이전트를 부를 때만 필요한 내용이 AI 모델(Anthropic Claude)로 전달되고, 학습에 쓰이지 않아요. 주민등록번호 같은 번호는 전달 전에 가려요. 다른 기기로 옮길 때는 설정에서 백업 파일을 내려받아 주세요. 공용 PC에서는 로그아웃할 때 '이 기기에 저장된 내 서류도 지우기'를 체크해 주세요.",
  },
  {
    q: "음성으로 면접 연습을 할 수 있나요?",
    a: "네. 면접관 질문을 소리로 읽어 주고, 마이크로 답하면 글로 옮겨요. 크롬과 엣지에서 가장 잘 동작해요.",
  },
  SITE.beta
    ? {
        q: "지금 바로 쓸 수 있나요?",
        a: "비공개 베타 기간이라 운영자 승인이 필요해요. 이메일로 이용 신청을 하면 운영자가 확인하고 승인해요. 승인되면 바로 쓸 수 있어요. 베타 기간에는 무료예요. 승인 전에도 예시 결과는 로그인 없이 볼 수 있어요.",
      }
    : {
        q: "해지와 환불은 어떻게 하나요?",
        a: "구독은 언제든 해지할 수 있고, 해지해도 결제한 기간이 끝날 때까지 쓸 수 있어요. 환불 기준은 이용약관에 적어 두었어요.",
      },
];

const START = SITE.beta ? { href: "/signup", label: "이용 신청하기" } : { href: "/app", label: "무료로 한 회사 준비하기" };
const PREVIEW = `/apply/${DEMO_APP_ID}?tab=overview`;

export default function Landing() {
  return (
    <>
      {/* 히어로 */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <h1 className="font-serif text-[2.35rem] font-bold leading-[1.22] tracking-tight text-brand-900 sm:text-5xl sm:leading-[1.18] dark:text-white">
            서류는 그 회사의
            <br />
            기준으로 고쳐야
            <br />
            붙습니다.
          </h1>
          <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-slate-600 dark:text-slate-300">
            {SITE.name}은 지원하는 회사를 먼저 조사하고, 그 회사의 인재상과 평가 기준으로 자기소개서를 채점하고 고쳐요. 마지막에는 그 서류를 읽은 면접관과 연습해요.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={START.href} className="inline-flex h-12 items-center rounded-lg bg-brand-900 px-6 text-[15px] font-semibold text-white hover:bg-brand-800 dark:bg-brand-200 dark:text-brand-950">
              {START.label}
            </Link>
            <Link href={PREVIEW} className="inline-flex h-12 items-center gap-1.5 rounded-lg px-4 text-[15px] font-semibold text-brand-900 hover:bg-brand-900/5 dark:text-brand-200">
              <Eye className="size-4" />결과 미리보기
            </Link>
          </div>
          <p className="mt-4 max-w-[34rem] text-sm leading-relaxed text-slate-500">
            {SITE.beta
              ? "지금은 비공개 베타예요. 이메일로 이용 신청을 하면 운영자 승인 뒤 무료로 쓸 수 있어요. 미리보기는 로그인 없이 볼 수 있는 가상 회사 예시예요."
              : "카드 등록 없이 한 회사를 끝까지 준비해 볼 수 있어요. 미리보기는 가상의 회사로 만든 예시예요."}
          </p>
        </div>
        <div className="pb-6 lg:pl-6">
          <HeroSheet />
        </div>
      </section>

      {/* 흐름: 실제로 순서가 있는 과정이라 번호를 붙여요 */}
      <section className="border-y border-rule bg-sheet">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-brand-900 dark:text-white">회사 하나를 이렇게 준비해요</h2>
          <ol className="relative mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
            <span className="absolute left-4 top-4 hidden h-px w-[calc(100%-2rem)] bg-rule md:block" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 md:block">
                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-900 font-serif text-sm font-bold text-white ring-4 ring-sheet dark:bg-brand-200 dark:text-brand-950">
                  {i + 1}
                </span>
                <div className="md:mt-4">
                  <h3 className="font-bold text-slate-900 dark:text-white">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 기능 */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 space-y-20 px-4 py-20 sm:px-6">
        <Feature
          icon={<Search />}
          title="회사가 무엇을 보는지부터 정리해요"
          body="채용공고를 직접 읽고 공식 인재상, 최근 1년 뉴스, 직무 요건을 모아요. 서류와 면접에서 볼 항목을 비중까지 정리한 평가 기준표를 만들고, 이후 모든 단계가 이 표를 기준으로 움직여요."
          visual={<ResearchVisual />}
        />
        <Feature
          icon={<FileText />}
          reverse
          title="문항과 글자 수에 맞춰, 내 경험으로만 써요"
          body="회사 사이트의 문항과 글자 수 제한을 그대로 넣으면 문항마다 경험 하나를 깊게 써요. 문항별 글자 수와 남은 글자를 바로 보여주고, 버전마다 무엇이 바뀌었는지 비교할 수 있어요."
          visual={<WriterVisual />}
        />
        <Feature
          icon={<PenLine />}
          title="평가관처럼 채점하고, 문장 단위로 고쳐요"
          body="평가 기준별 점수, 문항별 평가, 고칠 문장과 수정안을 줘요. 버튼 한 번으로 피드백을 반영한 수정본을 만들고 다시 채점해서 점수가 어떻게 바뀌는지 볼 수 있어요."
          visual={<EvalVisual />}
        />
        <Feature
          icon={<Mic />}
          reverse
          title="내 서류를 읽은 면접관과 연습해요"
          body="면접 유형, 질문 수, 난이도, 답변 제한 시간을 고르면 실제 면접처럼 한 질문씩 진행해요. 답이 모호하면 꼬리질문이 이어지고, 끝나면 질문별로 더 나은 답변 예시를 받아요."
          visual={<InterviewVisual />}
        />
      </section>

      {/* 요금. 비공개 베타 동안에는 요금제 대신 이용 방법을 보여줘요. */}
      {SITE.beta ? (
        <section id="beta" className="scroll-mt-20 border-t border-rule bg-sheet/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-2xl font-bold text-brand-900 dark:text-white">지금은 비공개 베타예요</h2>
            <p className="mt-2 text-slate-500">결제 없이, 승인된 분께 모든 기능을 열어 두고 있어요.</p>
            <div className="mt-10">
              <BetaAccess />
            </div>
          </div>
        </section>
      ) : (
        <section id="pricing" className="border-t border-rule bg-sheet/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="font-serif text-2xl font-bold text-brand-900 dark:text-white">요금</h2>
            <p className="mt-2 text-slate-500">한 회사는 무료로 끝까지 준비해 볼 수 있어요.</p>
            <div className="mt-10">
              <Pricing />
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="font-serif text-2xl font-bold text-brand-900 dark:text-white">자주 묻는 질문</h2>
        <div className="mt-8 divide-y divide-rule border-y border-rule">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 marker:hidden dark:text-white">
                {f.q}
                <span className="text-xl font-normal text-slate-400 transition group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 마지막 권유 */}
      <section className="bg-brand-900 dark:border-y dark:border-brand-800 dark:bg-brand-950">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">제출하기 전에, 그 회사 기준으로 한 번 채점받아 보세요.</h2>
            <p className="mt-2 text-brand-200">지금 쓰고 있는 자기소개서를 붙여넣기만 하면 돼요.</p>
          </div>
          <Link href={START.href} className="inline-flex h-12 shrink-0 items-center rounded-lg bg-white px-6 text-[15px] font-semibold text-brand-900 hover:bg-brand-50">
            {SITE.beta ? START.label : "무료로 시작하기"}
          </Link>
        </div>
      </section>
    </>
  );
}

function Feature({ icon, title, body, visual, reverse }: { icon: React.ReactNode; title: string; body: string; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200 [&_svg]:size-5">{icon}</span>
        <h3 className="mt-5 font-serif text-[1.6rem] font-bold leading-snug text-brand-900 dark:text-white">{title}</h3>
        <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-slate-600 dark:text-slate-300">{body}</p>
      </div>
      <div>{visual}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-sheet p-5 ring-1 ring-rule sm:p-6">{children}</div>;
}

function ResearchVisual() {
  const rows = [
    ["직무 전문성", 35],
    ["사용자 관점의 문제 해결", 25],
    ["주도성", 20],
    ["회사·산업 이해", 20],
  ] as const;
  return (
    <Panel>
      <ul className="space-y-1.5 text-[13px] text-slate-500">
        <li className="flex items-center gap-2"><Search className="size-3.5" /> &quot;한빛페이 인재상&quot; 검색</li>
        <li className="flex items-center gap-2"><Search className="size-3.5" /> &quot;한빛페이 2026 해외 송금&quot; 검색</li>
        <li className="flex items-center gap-2"><FileText className="size-3.5" /> 채용공고 페이지 읽기</li>
      </ul>
      <div className="mt-5 border-t border-rule pt-4">
        <p className="text-sm font-bold text-slate-900 dark:text-white">평가 기준</p>
        <div className="mt-3 space-y-3">
          {rows.map(([label, w]) => (
            <div key={label}>
              <div className="flex justify-between text-[13px]">
                <span className="text-slate-700 dark:text-slate-300">{label}</span>
                <span className="tabular-nums text-slate-500">{w}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-brand-700 dark:bg-brand-300" style={{ width: `${(w / 35) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function WriterVisual() {
  const qs = [
    ["지원 동기와 입사 후 포부", 682, 700],
    ["가장 어려웠던 협업 경험", 471, 500],
    ["직무 역량을 키운 경험", 803, 800],
  ] as const;
  return (
    <Panel>
      <div className="space-y-4">
        {qs.map(([q, n, limit], i) => {
          const over = n > limit;
          return (
            <div key={q}>
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="text-slate-700 dark:text-slate-300">{i + 1}. {q}</span>
                <span className={`shrink-0 tabular-nums ${over ? "font-bold text-pen" : "text-slate-500"}`}>
                  {n} / {limit}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full ${over ? "bg-pen" : "bg-pass"}`} style={{ width: `${Math.min(100, (n / limit) * 100)}%` }} />
              </div>
              {over && <p className="mt-1 text-xs text-pen">3자 초과</p>}
            </div>
          );
        })}
      </div>
      <p className="mt-5 rounded-md bg-paper px-3 py-2 font-serif text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-300">
        신규 가입 흐름을 다시 설계해 이탈률을{" "}
        <mark className="rounded bg-marker px-1 text-slate-900">[성과 수치 입력]</mark> 낮췄습니다.
      </p>
      <p className="mt-2 text-xs text-slate-500">프로필에 없는 수치는 지어내지 않고 빈칸으로 남겨요.</p>
    </Panel>
  );
}

function EvalVisual() {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 text-[13px]">
          {[
            ["직무 전문성", 8],
            ["사용자 관점의 문제 해결", 7],
            ["주도성", 6],
            ["회사·산업 이해", 4],
          ].map(([l, s]) => (
            <div key={l as string} className="flex items-center gap-3">
              <span className="w-36 text-slate-600 dark:text-slate-300">{l}</span>
              <span className={`tabular-nums font-semibold ${Number(s) < 6 ? "text-pen" : "text-slate-800 dark:text-slate-200"}`}>{s} / 10</span>
            </div>
          ))}
        </div>
        <ScoreStamp score={72} size={78} rotate={-6} />
      </div>
      <div className="mt-5 space-y-2 border-t border-rule pt-4 text-[13.5px] leading-relaxed">
        <p className="font-semibold text-slate-900 dark:text-white">1. 이 회사여야 하는 이유가 없어요</p>
        <p className="rounded-r-md border-l-2 border-pen bg-pen-soft px-3 py-1.5 text-slate-700 underline decoration-pen decoration-wavy underline-offset-4 dark:text-slate-300">
          금융을 더 쉽게 만드는 회사에서 일하고 싶습니다.
        </p>
        <p className="text-slate-700 dark:text-slate-300">
          <b>수정안:</b> 해외 송금 수수료를 화면에서 먼저 보여주는 작업처럼, 한빛페이가 올해 시작한 일에 바로 기여하고 싶습니다.
        </p>
      </div>
    </Panel>
  );
}

function InterviewVisual() {
  return (
    <Panel>
      <div className="space-y-3 text-[13.5px] leading-relaxed">
        <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-paper px-3.5 py-2.5 text-slate-800 dark:text-slate-200">
          <b>Q3.</b> 결제 완료율을 9% 올렸다고 쓰셨는데, 그중 본인이 직접 한 일은 무엇이었나요?
        </div>
        <div className="ml-auto max-w-[80%] rounded-xl rounded-tr-sm bg-brand-900 px-3.5 py-2.5 text-white dark:bg-brand-700">
          버튼 문구와 위치를 바꾸는 A/B 테스트를 설계했고…
        </div>
        <div className="max-w-[85%] rounded-xl rounded-tl-sm bg-paper px-3.5 py-2.5 text-slate-800 dark:text-slate-200">
          <b>Q3-1.</b> 테스트 기간과 표본은 어떻게 정하셨어요?
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 text-xs text-slate-500">
        <Timer className="size-3.5" />
        <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full w-2/3 rounded-full bg-brand-700 dark:bg-brand-300" />
        </div>
        <span className="tabular-nums">58초</span>
      </div>
    </Panel>
  );
}
