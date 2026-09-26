import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url,
    ...(authToken ? { authToken } : {}),
  },
});
