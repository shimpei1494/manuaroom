import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getRuntimeEnv } from "../env/runtime-env";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const env = getRuntimeEnv();
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
  cached = drizzle(client, { schema });
  return cached;
}
