import { env } from "cloudflare:workers";

/**
 * Worker のバインディングと変数 (wrangler.jsonc / .dev.vars / wrangler secret)。
 * 型は `vp run cf-typegen` (wrangler types) で worker-configuration.d.ts に生成される。
 */
export type RuntimeEnv = Env;

export function getRuntimeEnv(): RuntimeEnv {
  return env;
}

export function requireOpenAiApiKey(env: RuntimeEnv): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return env.OPENAI_API_KEY;
}
