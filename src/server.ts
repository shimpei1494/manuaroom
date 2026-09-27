import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

/**
 * Worker の入口。画面・API は TanStack Start の fetch に任せ、
 * wrangler.jsonc の triggers.crons で決めた時刻 (週 1 回) に期限の通知を送る。
 * Cron は Worker の中から直接呼ばれるので、Cloudflare Access は通らない。
 */
export default {
  ...createServerEntry({ fetch: handler.fetch }),
  scheduled(_controller: ScheduledController, _env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runWeeklyDigest());
  },
};

async function runWeeklyDigest() {
  // 静的に import すると、画面側と共有するモジュール (dayjs など) が入口のチャンクに入り、
  // ビルド後にチャンク同士の循環 import で初期化に失敗するので、使うときに読み込む
  const { sent } = await Promise.all([
    import("./application/usecases/send-weekly-digest"),
    import("./infrastructure/deps"),
  ]).then(([{ sendWeeklyDigest }, { getDeps }]) => sendWeeklyDigest(getDeps()));
  console.log(sent ? "週次通知を送りました" : "今週は知らせるタスクがないので送りませんでした");
}
