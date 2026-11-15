import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import type { CurrentUser } from "../features/user/user-display";
import { readAccessConfig } from "../infrastructure/auth/access-config";
import { verifyAccessRequest } from "../infrastructure/auth/access-jwt";
import { getRuntimeEnv } from "../infrastructure/env/runtime-env";

/**
 * ヘッダーのアバター用に、いまログインしている人を返す。
 * データは家族で共有 (APP_USER_ID) のままで、ここで返すのは「誰が見ているか」の表示用の情報だけ。
 * 入口のミドルウェア (src/start.ts) で検証済みの JWT を、メールアドレスを読むためにもう一度検証する
 * (公開鍵は jose がキャッシュするので、追加の通信はほぼない)。
 */
export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentUser> => {
    if (import.meta.env.DEV) return { kind: "local" };
    const verification = await verifyAccessRequest(getRequest(), readAccessConfig(getRuntimeEnv()));
    return { kind: "access", email: verification.ok ? verification.email : null };
  },
);
