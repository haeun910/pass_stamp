"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AppData,
  Application,
  Doc,
  InterviewSession,
  Profile,
  defaultInterviewSettings,
  emptyProfile,
  newApplication,
  newDoc,
  uid,
  DocType,
} from "./types";

const KEY = "online-interviewer:v2";
const LEGACY_KEY = "online-interviewer:v1";

function emptyData(): AppData {
  return { version: 2, profile: emptyProfile(), applications: [] };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const arr = <T,>(v: unknown, fn: (x: Record<string, unknown>) => T): T[] => (Array.isArray(v) ? v.filter(isObj).map(fn) : []);

/**
 * 저장된 데이터나 백업 파일에 빠진 항목이 있어도 화면이 깨지지 않게 기본값으로 채워요.
 * 잘못된 백업 하나 때문에 앱이 계속 열리지 않는 일을 막아요.
 */
export function normalizeData(raw: unknown): AppData | null {
  if (!isObj(raw) || raw.version !== 2 || !Array.isArray(raw.applications)) return null;
  const profile = { ...emptyProfile() };
  if (isObj(raw.profile)) for (const k of Object.keys(profile) as (keyof Profile)[]) if (typeof raw.profile[k] === "string") profile[k] = raw.profile[k] as string;
  const applications = arr(raw.applications, (a) => {
    const base = newApplication();
    const app = { ...base, ...a, id: typeof a.id === "string" ? a.id : base.id } as Application;
    app.docs = arr(a.docs, (d) => {
      const nd = newDoc((typeof d.type === "string" ? d.type : "자기소개서") as DocType);
      return {
        ...nd,
        ...d,
        id: typeof d.id === "string" ? d.id : nd.id,
        content: typeof d.content === "string" ? d.content : "",
        questions: Array.isArray(d.questions) ? d.questions : [],
        versions: Array.isArray(d.versions) ? d.versions : [],
        evaluations: Array.isArray(d.evaluations) ? d.evaluations : [],
      } as Doc;
    });
    app.interviews = arr(a.interviews, (x) => ({
      id: uid(),
      report: "",
      score: null,
      startedAt: Date.now(),
      endedAt: null,
      ...x,
      settings: { ...defaultInterviewSettings(), ...(isObj(x.settings) ? x.settings : {}) },
      messages: Array.isArray(x.messages) ? x.messages : [],
    }) as InterviewSession);
    return app;
  });
  return { version: 2, profile, applications };
}

/** v1(단일 서류, 텍스트 경험) 데이터를 v2 구조로 옮겨요. */
function migrateLegacy(raw: string): AppData | null {
  try {
    const old = JSON.parse(raw) as {
      myExperience?: string;
      applications?: {
        company?: string;
        role?: string;
        jobPosting?: string;
        companyProfile?: string;
        docType?: string;
        docRequest?: string;
        document?: string;
        evaluation?: string;
        interviewMode?: string;
        interview?: { role: "user" | "assistant"; content: string }[];
        createdAt?: number;
      }[];
    };
    const data = emptyData();
    data.profile.experience = old.myExperience ?? "";
    for (const o of old.applications ?? []) {
      if (!o.company && !o.document && !o.companyProfile) continue;
      const app = newApplication();
      Object.assign(app, {
        company: o.company ?? "",
        role: o.role ?? "",
        jobPosting: o.jobPosting ?? "",
        companyProfile: o.companyProfile ?? "",
        researchedAt: o.companyProfile ? Date.now() : null,
        createdAt: o.createdAt ?? Date.now(),
      });
      if (o.document?.trim()) {
        const type = (["자기소개서", "이력서", "포트폴리오"].includes(o.docType ?? "") ? o.docType : "자기소개서") as DocType;
        const d = newDoc(type);
        d.questions = [];
        d.request = o.docRequest ?? "";
        d.content = o.document;
        const v = { id: uid(), content: o.document, at: Date.now(), note: "이전 버전에서 가져옴" };
        d.versions = [v];
        if (o.evaluation) d.evaluations = [{ id: uid(), versionId: v.id, content: o.evaluation, score: null, at: Date.now() }];
        app.docs = [d];
      }
      if (o.interview?.length) {
        app.interviews = [
          {
            id: uid(),
            settings: { mode: o.interviewMode ?? "직무 + 인성 종합", questionCount: 7, difficulty: "기본", answerSeconds: 0, voice: false },
            messages: o.interview,
            report: "",
            score: null,
            startedAt: Date.now(),
            endedAt: null,
          },
        ];
      }
      data.applications.push(app);
    }
    return data;
  } catch {
    return null;
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = normalizeData(JSON.parse(raw));
      if (parsed) return parsed;
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = migrateLegacy(legacy);
      if (migrated) return migrated;
    }
  } catch {}
  return emptyData();
}

interface Store {
  ready: boolean;
  data: AppData;
  saveError: boolean;
  setProfile: (patch: Partial<Profile>) => void;
  createApp: () => string;
  deleteApp: (id: string) => void;
  updateApp: (id: string, patch: Partial<Application> | ((a: Application) => Partial<Application>)) => void;
  addDoc: (appId: string, type: DocType) => string;
  updateDoc: (appId: string, docId: string, patch: Partial<Doc> | ((d: Doc) => Partial<Doc>)) => void;
  deleteDoc: (appId: string, docId: string) => void;
  updateInterview: (
    appId: string,
    sessionId: string,
    patch: Partial<InterviewSession> | ((s: InterviewSession) => Partial<InterviewSession>),
  ) => void;
  replaceAll: (data: AppData) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<AppData | null>(null);
  const lastSaved = useRef(0);

  // 서버 렌더와 첫 화면이 어긋나지 않게 브라우저 저장소는 마운트 뒤에 읽어요.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 위 설명 참고
    setData(load());
    setReady(true);
  }, []);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!latest.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(latest.current));
      lastSaved.current = Date.now();
      latest.current = null;
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, []);

  // 스트리밍 중에는 매 토큰마다 저장하지 않도록 모아서 저장하되, 2초 넘게 미루지는 않아요.
  useEffect(() => {
    if (!ready) return;
    latest.current = data;
    if (timer.current) clearTimeout(timer.current);
    if (Date.now() - lastSaved.current > 2000) timer.current = setTimeout(flush, 0);
    else timer.current = setTimeout(flush, 400);
  }, [data, ready, flush]);

  // 탭을 닫거나 다른 앱으로 넘어갈 때 남은 변경을 바로 저장해요.
  useEffect(() => {
    const onHide = () => flush();
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [flush]);

  // 다른 탭에서 바뀐 내용도 반영해요.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const next = normalizeData(JSON.parse(e.newValue));
          if (next) setData(next);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const mapApp = useCallback((id: string, fn: (a: Application) => Application) => {
    setData((d) => ({ ...d, applications: d.applications.map((a) => (a.id === id ? { ...fn(a), updatedAt: Date.now() } : a)) }));
  }, []);

  const store = useMemo<Store>(
    () => ({
      ready,
      data,
      saveError,
      setProfile: (patch) => setData((d) => ({ ...d, profile: { ...d.profile, ...patch } })),
      createApp: () => {
        const app = newApplication();
        setData((d) => ({ ...d, applications: [app, ...d.applications] }));
        return app.id;
      },
      deleteApp: (id) => setData((d) => ({ ...d, applications: d.applications.filter((a) => a.id !== id) })),
      updateApp: (id, patch) => mapApp(id, (a) => ({ ...a, ...(typeof patch === "function" ? patch(a) : patch) })),
      addDoc: (appId, type) => {
        const doc = newDoc(type);
        mapApp(appId, (a) => ({ ...a, docs: [...a.docs, doc] }));
        return doc.id;
      },
      updateDoc: (appId, docId, patch) =>
        mapApp(appId, (a) => ({
          ...a,
          docs: a.docs.map((d) =>
            d.id === docId ? { ...d, ...(typeof patch === "function" ? patch(d) : patch), updatedAt: Date.now() } : d,
          ),
        })),
      deleteDoc: (appId, docId) => mapApp(appId, (a) => ({ ...a, docs: a.docs.filter((d) => d.id !== docId) })),
      updateInterview: (appId, sessionId, patch) =>
        mapApp(appId, (a) => ({
          ...a,
          interviews: a.interviews.map((s) => (s.id === sessionId ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s)),
        })),
      replaceAll: (next) => setData(normalizeData(next) ?? emptyData()),
    }),
    [ready, data, saveError, mapApp],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("StoreProvider가 필요해요");
  return s;
}

export function useApp(id: string) {
  const { data } = useStore();
  return data.applications.find((a) => a.id === id) ?? null;
}
