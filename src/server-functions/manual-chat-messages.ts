import type { ModelMessage, UIMessage } from "@tanstack/ai";

import type { ManualChatMessage } from "../application/ports/ai-service-port";

/**
 * useChat から届いた履歴を、ユースケースが扱う文字だけの発言に変換する。
 * 説明書チャットは文字のやり取りだけなので、ツール呼び出しや画像などは捨てる。
 */
export function toManualChatMessages(
  messages: ReadonlyArray<UIMessage | ModelMessage>,
): ManualChatMessage[] {
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const text = textOf(message).trim();
    return text ? [{ role: message.role, text }] : [];
  });
}

function textOf(message: UIMessage | ModelMessage): string {
  if ("parts" in message) {
    return message.parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
  }
  if (typeof message.content === "string") return message.content;
  return (message.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.content] : []))
    .join("");
}
