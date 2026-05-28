import { z } from "zod";

const RuntimeEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  STORAGE_DRIVER: z.enum(["local", "r2"]),
  UPLOAD_DIR: z.string().min(1),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

let cached: RuntimeEnv | null = null;

export function getRuntimeEnv(): RuntimeEnv {
  if (cached) return cached;
  const parsed = RuntimeEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid runtime environment: ${parsed.error.issues
        .map((i) => `${i.path.join(".")} ${i.message}`)
        .join("; ")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

export function requireOpenAiApiKey(env: RuntimeEnv): string {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return env.OPENAI_API_KEY;
}
