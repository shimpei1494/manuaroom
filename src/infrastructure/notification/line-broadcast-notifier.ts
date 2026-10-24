import type { NotifierPort } from "../../application/ports/notifier-port";

const BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast";
/** LINE のテキストメッセージの上限 */
const MAX_TEXT_LENGTH = 5000;

/**
 * LINE 公式アカウントを友だち追加している全員に送る (Messaging API の broadcast)。
 * 送り先の ID を集めるための webhook (Access の外に出す口) が要らないので、この方式にしている。
 * 無料プランでは「受け取った人数」が月 200 通の枠から減る。
 */
export function createLineBroadcastNotifier(options: {
  channelAccessToken: string;
  fetch?: typeof fetch;
}): NotifierPort {
  const doFetch = options.fetch ?? fetch;
  return {
    async send(message) {
      const text =
        message.length > MAX_TEXT_LENGTH ? `${message.slice(0, MAX_TEXT_LENGTH - 1)}…` : message;
      const response = await doFetch(BROADCAST_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.channelAccessToken}`,
          "Content-Type": "application/json",
          // 同じ送信を再試行しても二重に届かないようにする
          "X-Line-Retry-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ messages: [{ type: "text", text }] }),
      });
      if (!response.ok) {
        throw new Error(
          `LINE broadcast failed: ${response.status.toString()} ${await response.text()}`,
        );
      }
    },
  };
}

/** トークンが設定されていない環境 (vp dev など) 用。送らずにログへ出す。 */
export const consoleNotifier: NotifierPort = {
  send(message) {
    console.log(`[通知 (LINE 未設定のため送信せず)]\n${message}`);
    return Promise.resolve();
  },
};
