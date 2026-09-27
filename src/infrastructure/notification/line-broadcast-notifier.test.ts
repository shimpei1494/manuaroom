import { describe, expect, test } from "vite-plus/test";

import { createLineBroadcastNotifier } from "./line-broadcast-notifier";

function recordingFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchFn = (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(response);
  };
  return { calls, fetch: fetchFn as typeof fetch };
}

describe("createLineBroadcastNotifier", () => {
  test("broadcast API にトークン付きでテキストメッセージを 1 件送る", async () => {
    const { calls, fetch } = recordingFetch(new Response("{}", { status: 200 }));
    const notifier = createLineBroadcastNotifier({ channelAccessToken: "token-1", fetch });

    await notifier.send("今週のメンテナンス");

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.line.me/v2/bot/message/broadcast");
    expect(call?.init.method).toBe("POST");
    const headers = call?.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(headers["X-Line-Retry-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(String(call?.init.body))).toEqual({
      messages: [{ type: "text", text: "今週のメンテナンス" }],
    });
  });

  test("5000 文字を超える本文は切り詰める", async () => {
    const { calls, fetch } = recordingFetch(new Response("{}", { status: 200 }));
    const notifier = createLineBroadcastNotifier({ channelAccessToken: "t", fetch });

    await notifier.send("あ".repeat(6000));

    const body = JSON.parse(String(calls[0]?.init.body)) as { messages: { text: string }[] };
    expect(body.messages[0]?.text).toHaveLength(5000);
  });

  test("失敗したらステータスと本文を含めてエラーにする", async () => {
    const { fetch } = recordingFetch(
      new Response('{"message":"Authentication failed"}', { status: 401 }),
    );
    const notifier = createLineBroadcastNotifier({ channelAccessToken: "bad", fetch });

    await expect(notifier.send("x")).rejects.toThrow(/401.*Authentication failed/);
  });
});
