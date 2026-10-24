import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import type { AiServicePort } from "../ports/ai-service-port";
import { createFakeDeps, makeManual, makeProduct } from "../testing/fake-deps";
import { chatAboutManual } from "./chat-about-manual";

type AnswerInput = Parameters<AiServicePort["answerAboutManual"]>[0];

describe("chatAboutManual", () => {
  test("説明書の PDF と製品名、会話履歴を AI に渡して応答をそのまま返す", async () => {
    let received: AnswerInput | null = null;
    const deps = createFakeDeps({
      answerAboutManual: (input) => {
        received = input;
        return new Response("streamed");
      },
    });
    const product = makeProduct({ name: "食洗機" });
    await deps.productRepository.create(product);
    const manual = makeManual({ productId: product.id, fileName: "dish.pdf" });
    await deps.manualRepository.create(manual);
    const pdf = new TextEncoder().encode("%PDF-1.7").buffer;
    await deps.storage.put({ key: manual.fileKey, body: pdf, contentType: "application/pdf" });
    const messages = [{ role: "user" as const, text: "フィルターの外し方は？" }];

    const response = await chatAboutManual(deps, {
      manualId: manual.id,
      threadId: "thread-1",
      messages,
    });

    expect(await response.text()).toBe("streamed");
    expect(received).toMatchObject({
      fileName: "dish.pdf",
      productName: "食洗機",
      threadId: "thread-1",
      messages,
    });
    expect(new Uint8Array(received!.pdf)).toEqual(new Uint8Array(pdf));
  });

  test("他のユーザーの説明書には答えない", async () => {
    const deps = createFakeDeps({ userId: "me" });
    const manual = makeManual({ userId: "someone-else" });
    await deps.manualRepository.create(manual);

    await expect(
      chatAboutManual(deps, { manualId: manual.id, threadId: "t", messages: [] }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
