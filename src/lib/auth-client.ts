"use client";
import { createAuthClient } from "better-auth/client";

/** 브라우저에서 로그인, 로그아웃, 회원 탈퇴를 부를 때 써요. 같은 사이트의 /api/auth로 요청해요. */
export const authClient = createAuthClient();

/** 회원 탈퇴(승인 대기 중이면 신청 취소). 비밀번호를 다시 확인하고, 서버의 회원 정보와 로그인 기록을 바로 지워요. */
export async function deleteAccount(password: string): Promise<"ok" | "wrong-password" | "too-many" | "error"> {
  try {
    const { error } = await authClient.deleteUser({ password });
    if (!error) return "ok";
    if (error.status === 429) return "too-many";
    return error.code === "INVALID_PASSWORD" ? "wrong-password" : "error";
  } catch {
    return "error";
  }
}

/**
 * 페이지를 새로 불러오며 이동해요. 로그인 상태가 바뀐 뒤에는 화면이 기억한 이전 계정 정보(서버가 그린 화면, 저장소)를
 * 남기지 않으려고 router.push 대신 전체를 다시 불러와요.
 */
export function hardNavigate(path: string) {
  window.location.href = path;
}

/** 로그아웃하고 path로 보내요. */
export async function signOutTo(path: string) {
  try {
    await authClient.signOut();
  } catch {}
  hardNavigate(path);
}
