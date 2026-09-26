import { createMiddleware, createStart } from "@tanstack/react-start";

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

export const startInstance = createStart(() => ({
  requestMiddleware: [cloudflareAccessGuard],
}));
