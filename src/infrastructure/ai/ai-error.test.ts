import { describe, expect, it } from "vite-plus/test";

import { toAiServiceError } from "./ai-error";

function openAiError(message: string, code?: string): Error {
  return Object.assign(new Error(message), { code });
}

describe("toAiServiceError", () => {
  it("API キー未登録をそれとわかる文言にする", () => {
    const error = toAiServiceError(new Error("OPENAI_API_KEY is not set"));
    expect(error.message).toBe(
      "OpenAI の API キーがサーバーに登録されていません（OPENAI_API_KEY is not set）",
    );
  });

  it.each([
    ["401 Incorrect API key provided", "invalid_api_key", "API キーが正しくありません"],
    [
      "429 You exceeded your current quota",
      "insufficient_quota",
      "利用枠（クレジット）が足りません",
    ],
    ["429 Rate limit reached", "rate_limit_exceeded", "混み合っています"],
    ["404 The model does not exist", "model_not_found", "AI モデルが使えません"],
    ["400 Invalid file", undefined, "PDF を受け付けませんでした"],
    ["500 Internal server error", undefined, "OpenAI 側でエラー"],
    ["fetch failed", undefined, "AI の呼び出しに失敗しました"],
  ])("%s を日本語の理由に直し、元の文言も残す", (message, code, expected) => {
    const original = openAiError(message, code);
    const error = toAiServiceError(original);
    expect(error.message).toContain(expected);
    expect(error.message).toContain(message);
    expect(error.cause).toBe(original);
  });
});
