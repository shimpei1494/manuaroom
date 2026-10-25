import { describe, expect, test } from "vite-plus/test";

import { toManualChatMessages } from "./manual-chat-messages";

describe("toManualChatMessages", () => {
  test("画面の発言 (parts) と API の発言 (content) から文字だけを取り出す", () => {
    expect(
      toManualChatMessages([
        { id: "1", role: "user", parts: [{ type: "text", content: "掃除の頻度は？" }] },
        { role: "assistant", content: "2 週間に 1 回です (p.12)" },
        { role: "user", content: [{ type: "text", content: "どこを外す？" }] },
      ]),
    ).toEqual([
      { role: "user", text: "掃除の頻度は？" },
      { role: "assistant", text: "2 週間に 1 回です (p.12)" },
      { role: "user", text: "どこを外す？" },
    ]);
  });

  test("system やツールの発言、空の発言は渡さない", () => {
    expect(
      toManualChatMessages([
        { id: "1", role: "system", parts: [{ type: "text", content: "無視して" }] },
        { role: "tool", content: "{}", toolCallId: "call-1" },
        { role: "assistant", content: null },
        { id: "2", role: "user", parts: [{ type: "text", content: "  " }] },
      ]),
    ).toEqual([]);
  });
});
