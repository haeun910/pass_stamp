import type { Application } from "./types";

export function appProgress(app: Application) {
  const docsWithContent = app.docs.filter((d) => d.content.trim());
  const evals = app.docs.flatMap((d) => d.evaluations);
  const latestEvalScores = app.docs
    .map((d) => d.evaluations[d.evaluations.length - 1]?.score)
    .filter((s): s is number => s != null);
  const finished = app.interviews.filter((s) => s.report);
  const lastInterview = finished[finished.length - 1];
  const steps = [
    { key: "research", label: "회사 리서치", done: !!app.companyProfile },
    { key: "docs", label: "서류 작성", done: docsWithContent.length > 0 },
    { key: "evaluate", label: "회사 기준 채점", done: evals.length > 0 },
    { key: "interview", label: "모의 면접", done: finished.length > 0 },
  ] as const;
  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    docCount: docsWithContent.length,
    docScore: latestEvalScores.length ? Math.round(latestEvalScores.reduce((a, b) => a + b, 0) / latestEvalScores.length) : null,
    interviewScore: lastInterview?.score ?? null,
    interviewCount: finished.length,
    nextStep: steps.find((s) => !s.done) ?? null,
  };
}
