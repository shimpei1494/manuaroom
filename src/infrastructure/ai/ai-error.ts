/**
 * OpenAI (TanStack AI 経由) の失敗を、画面に出せる日本語のメッセージに直す。
 *
 * TanStack AI は OpenAI のエラーを「401 Incorrect API key provided」のような message と
 * `code` (invalid_api_key など) を持つ Error にして投げる。原因の手がかりを消さないよう、
 * 元のエラーは cause に残し、メッセージの末尾にも元の文言を添える。
 */
export function toAiServiceError(error: unknown): Error {
  const original = error instanceof Error ? error.message : String(error);
  const code = errorCode(error);
  const reason = describe(code, original);
  return new Error(`${reason}（${original}）`, { cause: error });
}

function describe(code: string | undefined, message: string): string {
  if (message.includes("OPENAI_API_KEY is not set")) {
    return "OpenAI の API キーがサーバーに登録されていません";
  }
  if (code === "invalid_api_key" || message.startsWith("401")) {
    return "OpenAI の API キーが正しくありません";
  }
  if (code === "insufficient_quota") {
    return "OpenAI の利用枠（クレジット）が足りません";
  }
  if (code === "rate_limit_exceeded" || message.startsWith("429")) {
    return "OpenAI が混み合っています。少し待ってからもう一度試してください";
  }
  if (code === "model_not_found" || message.startsWith("404")) {
    return "指定している AI モデルが使えません";
  }
  if (message.startsWith("400") || message.startsWith("413")) {
    return "OpenAI が PDF を受け付けませんでした（ページ数やサイズが上限を超えている可能性があります）";
  }
  if (message.startsWith("5")) {
    return "OpenAI 側でエラーが起きました。少し待ってからもう一度試してください";
  }
  return "AI の呼び出しに失敗しました";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
