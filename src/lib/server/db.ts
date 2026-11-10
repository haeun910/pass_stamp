import "server-only";
import { Pool } from "pg";

// 개발 서버는 파일을 고칠 때마다 모듈을 다시 읽어요. 그때마다 연결이 새로 쌓이지 않게 전역에 하나만 둬요.
const g = globalThis as unknown as { __passStampPool?: Pool };

/**
 * Postgres 연결 풀. Vercel처럼 인스턴스가 여러 개 뜨는 곳에서는 인스턴스마다 풀이 생기니
 * 연결 수를 작게 두고, Neon이라면 연결 풀링 주소(-pooler가 붙은 주소)를 DATABASE_URL로 쓰세요.
 */
export function db(): Pool {
  if (!g.__passStampPool) {
    g.__passStampPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return g.__passStampPool;
}
