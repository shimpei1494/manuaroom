import { defineConfig } from "drizzle-kit";

// SQL の生成 (`vp run db:generate`) 専用。
// 適用は wrangler で行う (`vp run db:migrate` / `vp run db:migrate:remote`)。
export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
});
