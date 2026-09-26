import type { AuthPort } from "../../application/ports/auth-port";

/**
 * 本番用。入口の検証は src/start.ts のリクエストミドルウェア (Cloudflare Access の JWT) が行い、
 * 通過した家族全員に同じユーザー ID を返す (ADR 0005「データの所有者」)。
 */
export function createSharedUserAuth(appUserId: string): AuthPort {
  return {
    requireUserId() {
      return Promise.resolve(appUserId);
    },
  };
}
