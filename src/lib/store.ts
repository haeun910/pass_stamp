"use client";
import { useCallback, useEffect, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  jobPosting: string;
  companyProfile: string;
  docType: string;
  docRequest: string;
  document: string;
  evaluation: string;
  interviewMode: string;
  interview: ChatMessage[];
  createdAt: number;
}

interface State {
  myExperience: string;
  applications: Application[];
  activeId: string | null;
}

const KEY = "online-interviewer:v1";

function newApplication(): Application {
  return {
    id: Math.random().toString(36).slice(2, 10),
    company: "",
    role: "",
    jobPosting: "",
    companyProfile: "",
    docType: "자기소개서",
    docRequest: "",
    document: "",
    evaluation: "",
    interviewMode: "직무 + 인성 종합 면접",
    interview: [],
    createdAt: Date.now(),
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {}
  const first = newApplication();
  return { myExperience: "", applications: [first], activeId: first.id };
}

export function useStore() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => setState(load()), []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const active = state?.applications.find((a) => a.id === state.activeId) ?? state?.applications[0] ?? null;

  const updateApp = useCallback((id: string, patch: Partial<Application>) => {
    setState((s) =>
      s ? { ...s, applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)) } : s,
    );
  }, []);

  const addApp = useCallback(() => {
    const app = newApplication();
    setState((s) => (s ? { ...s, applications: [app, ...s.applications], activeId: app.id } : s));
  }, []);

  const removeApp = useCallback((id: string) => {
    setState((s) => {
      if (!s) return s;
      let apps = s.applications.filter((a) => a.id !== id);
      if (apps.length === 0) apps = [newApplication()];
      return { ...s, applications: apps, activeId: s.activeId === id ? apps[0].id : s.activeId };
    });
  }, []);

  const select = useCallback((id: string) => setState((s) => (s ? { ...s, activeId: id } : s)), []);
  const setExperience = useCallback((v: string) => setState((s) => (s ? { ...s, myExperience: v } : s)), []);

  return { state, active, updateApp, addApp, removeApp, select, setExperience };
}
