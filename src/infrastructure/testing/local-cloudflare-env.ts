import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { getPlatformProxy } from "wrangler";

const MIGRATIONS_DIR = "drizzle";

/**
 * wrangler.jsonc のバインディング (D1・R2) を Miniflare のメモリ上に立ち上げ、
 * drizzle/ のマイグレーションを適用した状態で返す。リポジトリ等の結合テスト用。
 */
export async function startLocalCloudflareEnv(): Promise<{
  env: Env;
  dispose: () => Promise<void>;
}> {
  const proxy = await getPlatformProxy<Env>({ persist: false });
  await applyMigrations(proxy.env.DB);
  return { env: proxy.env, dispose: proxy.dispose };
}

async function applyMigrations(db: D1Database): Promise<void> {
  // drizzle-kit の連番ファイル名 (0000_*.sql) の順に、1 つの batch で順番に適用する
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const sqls = await Promise.all(files.map((f) => readFile(join(MIGRATIONS_DIR, f), "utf8")));
  const statements: D1PreparedStatement[] = [];
  for (const statement of sqls
    .join("\n--> statement-breakpoint\n")
    .split("--> statement-breakpoint")) {
    if (statement.trim().length > 0) statements.push(db.prepare(statement));
  }
  await db.batch(statements);
}

/** テストごとに全テーブルを空にする (外部キーの向きに合わせて子から消す)。 */
export async function clearTables(db: D1Database): Promise<void> {
  await db.batch(
    ["ai_suggestions", "maintenance_logs", "maintenance_tasks", "manuals", "products"].map((t) =>
      db.prepare(`DELETE FROM ${t}`),
    ),
  );
}
