"use client";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { signOutTo } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import type { Viewer } from "@/lib/viewer";

/** 사이드바 아래 계정 표시와 로그아웃. 공용 PC를 위해 이 기기의 서류를 함께 지우는 선택지를 줘요. */
export function AccountBox({ viewer }: { viewer: Viewer }) {
  const { forget } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    if (wipe) forget();
    await signOutTo("/");
  };

  return (
    <div data-keep-open className="rounded-lg px-2.5 py-2">
      <div className="flex items-center gap-2.5">
        <Initial name={viewer.name || viewer.email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{viewer.name || "이름 없음"}</p>
          <p className="truncate text-xs text-slate-500">{viewer.email}</p>
        </div>
        {!confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-900/5 hover:text-brand-900 dark:hover:bg-white/5 dark:hover:text-white"
            aria-label="로그아웃"
            title="로그아웃"
          >
            <LogOut className="size-4" />
          </button>
        )}
      </div>
      {confirming && (
        <div className="mt-2.5 space-y-2.5 rounded-lg border border-rule bg-sheet p-3">
          <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <input type="checkbox" className="mt-0.5 accent-brand-800" checked={wipe} onChange={(e) => setWipe(e.target.checked)} />
            <span>이 기기에 저장된 내 서류도 지우기 (공용 PC라면 체크해 주세요)</span>
          </label>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={logout} disabled={busy}>
              로그아웃
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              취소
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 프로필 사진 대신 이름 첫 글자를 보여줘요. 외부 이미지를 불러오지 않아서 빠르고, 다른 서버에 접속 기록이 남지 않아요. */
export function Initial({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-900 font-serif font-bold text-white dark:bg-brand-200 dark:text-brand-950 ${size === "lg" ? "size-11 text-lg" : "size-8 text-sm"}`}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
