"use client";
import { createContext, useContext } from "react";
import type { Viewer } from "./viewer";

/** 앱 화면 안에서 로그인 상태를 읽어요. auth가 false면 로그인을 안 쓰는 로컬 개발이에요. */
export const ViewerContext = createContext<{ auth: boolean; viewer: Viewer | null }>({ auth: false, viewer: null });

export function useViewer() {
  return useContext(ViewerContext);
}
