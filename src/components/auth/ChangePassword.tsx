"use client";
import { useId, useState } from "react";
import { Button, inputCls } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

/** 비밀번호 변경. 바꾸면 다른 기기의 로그인을 끊어요(임시 비밀번호를 받은 뒤 바꿀 때도 써요). */
export function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setMsg({ tone: "error", text: "새 비밀번호를 8자 이상으로 정해 주세요." });
    if (next !== confirm) return setMsg({ tone: "error", text: "새 비밀번호 확인이 맞지 않아요." });
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
      if (error) {
        const text =
          error.status === 429
            ? "시도가 너무 많아요. 몇 분 뒤에 다시 해 주세요."
            : error.code === "INVALID_PASSWORD"
              ? "지금 비밀번호가 맞지 않아요."
              : error.code === "PASSWORD_TOO_SHORT"
                ? "새 비밀번호를 8자 이상으로 정해 주세요."
                : "바꾸지 못했어요. 잠시 후 다시 시도해 주세요.";
        setMsg({ tone: "error", text });
      } else {
        setCurrent("");
        setNext("");
        setConfirm("");
        setMsg({ tone: "ok", text: "비밀번호를 바꿨어요. 다른 기기의 로그인은 끊었어요." });
      }
    } catch {
      setMsg({ tone: "error", text: "바꾸지 못했어요. 잠시 후 다시 시도해 주세요." });
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="max-w-md space-y-3">
      <PasswordInput label="지금 비밀번호" autoComplete="current-password" value={current} onChange={setCurrent} />
      <PasswordInput label="새 비밀번호 (8자 이상)" autoComplete="new-password" value={next} onChange={setNext} />
      <PasswordInput label="새 비밀번호 확인" autoComplete="new-password" value={confirm} onChange={setConfirm} />
      {msg && (
        <p role={msg.tone === "error" ? "alert" : "status"} className={`text-sm ${msg.tone === "error" ? "text-pen" : "text-pass"}`}>
          {msg.text}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy}>
        비밀번호 바꾸기
      </Button>
    </form>
  );
}

function PasswordInput({ label, autoComplete, value, onChange }: { label: string; autoComplete: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <input id={id} type="password" autoComplete={autoComplete} required maxLength={128} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
