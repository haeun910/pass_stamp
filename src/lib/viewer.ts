/**
 * 회원 상태. 처음 로그인하면 pending(승인 대기)이고, 관리자가 /admin에서 수락하면 approved가 돼요.
 * blocked는 관리자가 이용을 중지한 계정이라 로그인 자체를 막아요.
 */
export type UserStatus = "pending" | "approved" | "blocked";

/** 화면과 API가 쓰는 로그인한 사람 정보. 서버가 세션에서 만들어 화면으로 넘겨요. */
export interface Viewer {
  id: string;
  name: string;
  email: string;
  image: string | null;
  status: UserStatus;
  isAdmin: boolean;
}

/** 관리 페이지(/admin)의 회원 한 줄. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  /** 관리자 계정(ADMIN_EMAIL). 관리 페이지에서 바꿀 수 없어요. */
  isAdmin: boolean;
  createdAt: string;
  lastSeenAt: string | null;
}
