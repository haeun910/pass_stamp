"use client";
import { Check, KeyRound, RefreshCw, UserX } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Initial } from "@/components/auth/AccountBox";
import { Badge, Button, Card, CopyButton, PageHeader, Spinner } from "@/components/ui";
import { formatDate, relativeTime } from "@/lib/text";
import type { AdminUser, UserStatus } from "@/lib/viewer";

type Action = "approve" | "block" | "unblock" | "delete" | "reset_password";

/** 처리 전에 한 번 더 묻는 문장. 되돌리기 어려운 작업만 물어요. */
const CONFIRM: Partial<Record<Action, (u: AdminUser) => string>> = {
  delete: (u) =>
    u.status === "pending"
      ? `${u.email}의 신청을 거절할까요? 신청 기록이 지워져서, 이 사람이 쓰려면 처음부터 다시 신청해야 해요.`
      : `${u.email} 계정을 지울까요? 회원 정보와 로그인 기록이 지워져서, 다시 쓰려면 처음부터 새로 신청해야 해요.`,
  block: (u) => `${u.email}의 이용을 중지할까요? 지금 로그인된 기기에서도 바로 로그아웃되고, 다시 허용하기 전까지 로그인할 수 없어요.`,
  reset_password: (u) => `${u.email}에게 임시 비밀번호를 만들어 줄까요? 지금 비밀번호는 바로 쓸 수 없게 되고, 로그인된 기기도 로그아웃돼요.`,
};

export function AdminUsers({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/users", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `목록을 불러오지 못했어요 (${r.status})`);
      setUsers(j.users);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load는 fetch 뒤에 비동기로 상태를 바꿔요
    load();
  }, [load]);

  const act = async (u: AdminUser, action: Action) => {
    const ask = CONFIRM[action];
    if (ask && !confirm(ask(u))) return;
    setBusyId(u.id);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId: u.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `처리하지 못했어요 (${r.status})`);
      setIssued(j.tempPassword ? { email: u.email, password: j.tempPassword } : null);
      window.dispatchEvent(new Event("admin-users-changed"));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  };

  const groups: { status: UserStatus; title: string; empty: string }[] = [
    { status: "pending", title: "승인 대기", empty: "새 신청이 없어요." },
    { status: "approved", title: "이용 중", empty: "아직 승인한 사람이 없어요." },
    { status: "blocked", title: "이용 중지", empty: "중지한 계정이 없어요." },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="가입 신청 관리"
        description="처음 로그인한 사람은 승인 대기로 들어와요. 수락한 사람만 AI 기능을 쓸 수 있어요. 새 신청 알림 메일은 보내지 않으니, 왼쪽 메뉴의 숫자를 가끔 확인해 주세요."
        actions={
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
            새로고침
          </Button>
        }
      />
      {error && (
        <p role="alert" className="rounded-lg bg-pen-soft px-4 py-2.5 text-sm text-pen">
          {error}
        </p>
      )}
      {issued && (
        <div role="status" className="space-y-2 rounded-xl border border-marker bg-marker/25 p-4 text-sm text-slate-800 dark:text-slate-100">
          <p>
            <b>{issued.email}</b>의 임시 비밀번호예요. 이 화면을 벗어나면 다시 볼 수 없어요.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-sheet px-3 py-1.5 font-mono text-base tracking-wider ring-1 ring-rule">{issued.password}</code>
            <CopyButton text={issued.password} />
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">본인에게만 전달하고, 로그인한 뒤 설정에서 새 비밀번호로 바꾸게 안내해 주세요.</p>
        </div>
      )}
      {!users && !error && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner />
          불러오는 중이에요…
        </div>
      )}
      {users &&
        groups.map((g) => {
          const list = users.filter((u) => (u.isAdmin ? "approved" : u.status) === g.status);
          return (
            <Card key={g.status} title={`${g.title} ${list.length}명`}>
              {list.length === 0 ? (
                <p className="text-sm text-slate-500">{g.empty}</p>
              ) : (
                <ul className="-my-3 divide-y divide-rule">
                  {list.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
                      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                        <Initial name={u.name || u.email} />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                            <span className="truncate">{u.name || "이름 없음"}</span>
                            {u.isAdmin && <Badge tone="brand">관리자</Badge>}
                            {u.id === selfId && <Badge>나</Badge>}
                          </p>
                          <p className="truncate text-sm text-slate-500">{u.email}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {g.status === "pending" ? "신청" : "가입"}{" "}
                            {formatDate(Date.parse(u.createdAt), false)}
                            {u.lastSeenAt && ` · 최근 접속 ${relativeTime(Date.parse(u.lastSeenAt))}`}
                          </p>
                        </div>
                      </div>
                      {!u.isAdmin && (
                        <div className="flex shrink-0 gap-1.5">
                          {u.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => act(u, "approve")} disabled={busyId === u.id}>
                                <Check />수락
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => act(u, "delete")} disabled={busyId === u.id}>
                                거절
                              </Button>
                            </>
                          )}
                          {u.status === "approved" && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => act(u, "reset_password")} disabled={busyId === u.id}>
                                <KeyRound />임시 비밀번호
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => act(u, "block")} disabled={busyId === u.id}>
                                <UserX />이용 중지
                              </Button>
                            </>
                          )}
                          {u.status === "blocked" && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => act(u, "unblock")} disabled={busyId === u.id}>
                                다시 허용
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => act(u, "delete")} disabled={busyId === u.id}>
                                삭제
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
    </div>
  );
}
