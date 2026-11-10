"use client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { Spinner, inputCls } from "@/components/ui";
import { authClient, hardNavigate } from "@/lib/auth-client";
import { DEMO_APP_ID } from "@/lib/demo-id";
import { SITE } from "@/lib/site";

interface AuthError {
  code?: string;
  status?: number;
}

/** Better Auth 오류를 이용자가 할 일로 바꿔요. 이메일이 있는지 없는지는 로그인 화면에서 드러내지 않아요. */
function errorText(e: AuthError, kind: "login" | "signup"): string {
  if (e.status === 429) return "시도가 너무 많아요. 몇 분 뒤에 다시 해 주세요.";
  switch (e.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "CREDENTIAL_ACCOUNT_NOT_FOUND":
      return "이메일이나 비밀번호가 맞지 않아요.";
    case "account_blocked":
      return `이용이 중지된 계정이에요. 문의는 ${SITE.supportEmail}로 보내 주세요.`;
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "이미 가입한 이메일이에요. 로그인해 주세요.";
    case "email_reserved":
      return "이 이메일로는 가입할 수 없어요.";
    case "INVALID_EMAIL":
      return "이메일 형식을 확인해 주세요.";
    case "PASSWORD_TOO_SHORT":
      return "비밀번호를 8자 이상으로 정해 주세요.";
    case "PASSWORD_TOO_LONG":
      return "비밀번호가 너무 길어요. 128자 이하로 정해 주세요.";
    default:
      return kind === "login" ? "로그인하지 못했어요. 잠시 후 다시 시도해 주세요." : "신청하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}

function Frame({ title, description, children }: { title: string; description: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl justify-center px-4 py-14 sm:px-6 sm:py-20">
      <section className="w-full max-w-[26rem]">
        <h1 className="font-serif text-[2rem] font-bold leading-tight text-brand-900 dark:text-white">{title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
        {children}
        <p className="mt-8 border-t border-rule pt-5 text-sm text-slate-500">
          결과물이 먼저 궁금하다면{" "}
          <Link href={`/apply/${DEMO_APP_ID}?tab=overview`} className="font-semibold text-brand-900 underline underline-offset-2 dark:text-brand-200">
            예시 결과 미리보기
          </Link>
        </p>
      </section>
    </div>
  );
}

function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <input id={id} className={`${inputCls} h-11 text-[15px]`} {...props} />
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

function PasswordField({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} className={`${inputCls} h-11 pr-11 text-[15px]`} {...props} />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label={shown ? "비밀번호 숨기기" : "비밀번호 보기"}
          aria-pressed={shown}
        >
          {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {hint && <p className="text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-900 text-[15px] font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 dark:bg-brand-200 dark:text-brand-950 dark:hover:bg-brand-100"
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

function Alert({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mt-6 rounded-lg px-4 py-3 text-sm leading-relaxed ${tone === "error" ? "bg-pen-soft text-pen" : "bg-pass-soft text-pass"}`}>
      {children}
    </p>
  );
}

export function LoginForm({ next, deleted }: { next: string; deleted: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error: err } = await authClient.signIn.email({ email: email.trim(), password });
      if (err) throw err;
      hardNavigate(next);
    } catch (err) {
      setError(errorText(err as AuthError, "login"));
      setBusy(false);
    }
  };

  return (
    <Frame title="로그인" description="지금은 비공개 베타라 운영자가 승인한 분만 쓸 수 있어요.">
      {deleted && <Alert tone="ok">계정을 지웠어요. 그동안 이용해 주셔서 고마워요.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <TextField label="이메일" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label="비밀번호" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="pt-2">
          <Submit busy={busy}>로그인</Submit>
        </div>
      </form>
      <div className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p>
          처음이라면{" "}
          <Link href="/signup" className="font-semibold text-brand-900 underline underline-offset-2 dark:text-brand-200">
            이용 신청하기
          </Link>
        </p>
        <p className="text-xs leading-relaxed text-slate-500">
          비밀번호를 잊었다면 가입한 이메일을 적어 {SITE.supportEmail}로 알려 주세요. 운영자가 임시 비밀번호를 드려요.
        </p>
      </div>
    </Frame>
  );
}

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("비밀번호를 8자 이상으로 정해 주세요.");
    if (password !== confirm) return setError("비밀번호 확인이 맞지 않아요.");
    if (!agree) return setError("이용약관과 개인정보처리방침에 동의해 주세요.");
    setBusy(true);
    setError("");
    try {
      const { error: err } = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
      if (err) throw err;
      // 가입하면 바로 로그인돼요. 앱에서는 승인 대기 화면이 보여요.
      hardNavigate("/app");
    } catch (err) {
      setError(errorText(err as AuthError, "signup"));
      setBusy(false);
    }
  };

  return (
    <Frame
      title="이용 신청"
      description="지금은 비공개 베타예요. 신청하면 운영자가 확인하고 승인해요. 승인되면 같은 이메일과 비밀번호로 로그인해 바로 쓸 수 있어요."
    >
      {error && <Alert tone="error">{error}</Alert>}
      <form onSubmit={submit} className="mt-8 space-y-4">
        <TextField label="이름" autoComplete="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="이메일" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} hint="로그인 아이디로 써요. 메일은 보내지 않아요." />
        <PasswordField
          label="비밀번호"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="8자 이상. 다른 사이트에서 쓰는 비밀번호와 다르게 정해 주세요."
        />
        <PasswordField label="비밀번호 확인" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <input type="checkbox" className="mt-1 size-4 accent-brand-800" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>
            <Link href="/terms" target="_blank" className="underline underline-offset-2 hover:text-brand-900 dark:hover:text-white">이용약관</Link>과{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-2 hover:text-brand-900 dark:hover:text-white">개인정보처리방침</Link>에
            동의해요 (필수)
          </span>
        </label>
        <div className="pt-2">
          <Submit busy={busy}>신청하기</Submit>
        </div>
      </form>
      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        이미 신청했다면{" "}
        <Link href="/login" className="font-semibold text-brand-900 underline underline-offset-2 dark:text-brand-200">
          로그인
        </Link>
      </p>
    </Frame>
  );
}
