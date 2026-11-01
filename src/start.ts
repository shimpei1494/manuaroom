import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

import { readAccessConfig } from "./infrastructure/auth/access-config";
import { verifyAccessRequest } from "./infrastructure/auth/access-jwt";
import { getRuntimeEnv } from "./infrastructure/env/runtime-env";

/**
 * すべてのリクエスト (画面・server function・API) の入口で Cloudflare Access の JWT を確かめる (ADR 0005)。
 * Access の設定漏れや、workers.dev の URL を Access の外から直接叩かれた場合も 403 にする。
 * vp dev (ローカル) では Access を通らないので検証しない。
 */
const cloudflareAccessGuard = createMiddleware().server(async ({ request, next }) => {
  if (import.meta.env.DEV) return next();

  let config;
  try {
    config = readAccessConfig(getRuntimeEnv());
  } catch (error) {
    console.error(error);
    return new Response("Forbidden", { status: 403 });
  }
  const verification = await verifyAccessRequest(request, config);
  if (!verification.ok) return new Response("Forbidden", { status: 403 });
  return next();
});

/**
 * server function は同一オリジンからの RPC なので、別サイトから送られたリクエストは 403 にする。
 * Access の Cookie はブラウザが自動で付けるため、Access の検証だけでは CSRF を防げない。
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * server function で投げられたエラーを Workers Logs (ダッシュボードの Observability) に残す。
 * 画面には通知で message だけが出るので、スタックトレースや cause はここでしか追えない。
 */
const serverFnErrorLogger = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    console.error("[serverFn] 失敗", error);
    throw error;
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, cloudflareAccessGuard],
  functionMiddleware: [serverFnErrorLogger],
}));
