"use client";
import { useId, useState } from "react";
import { Button, inputCls } from "@/components/ui";
import { deleteAccount, hardNavigate } from "@/lib/auth-client";

const MESSAGES = {
  "wrong-password": "비밀번호가 맞지 않아요.",
  "too-many": "시도가 너무 많아요. 몇 분 뒤에 다시 해 주세요.",
  error: "처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
} as const;

/**
 * 회원 탈퇴(승인 대기 중에는 신청 취소). 실수로 누르지 않게 비밀번호를 한 번 더 받아요.
 * beforeLeave에서 이 기기에 저장된 서류를 지워요(설정 화면).
 */
export function DeleteAccount({ label, confirmText, beforeLeave }: { label: string; confirmText: string; beforeLeave?: () => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await deleteAccount(password);
    if (r === "ok") {
      beforeLeave?.();
      hardNavigate("/login?deleted=1");
      return;
    }
    setBusy(false);
    setError(MESSAGES[r]);
  };

  if (!open) {
    return (
      <Button variant="danger" className="ring-1 ring-pen/30" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-lg border border-pen/30 bg-pen-soft/40 p-4">
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{confirmText}</p>
      <div className="space-y-1.5">
        <label htmlFor={id} className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
          비밀번호 확인
        </label>
        <input id={id} type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-pen">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="pen" disabled={busy || !password}>
          {label}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          그만두기
        </Button>
      </div>
    </form>
  );
}
