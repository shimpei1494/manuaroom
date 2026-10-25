import { NotFoundError } from "../../domain/errors";
import type { Deps } from "../deps";
import type { ManualChatMessage } from "../ports/ai-service-port";

/**
 * 説明書 1 冊について質問に答える (ADR 0008)。
 * 会話履歴は保存せず、毎回クライアントから受け取った履歴と PDF を AI に渡す。
 */
export async function chatAboutManual(
  deps: Pick<Deps, "auth" | "manualRepository" | "productRepository" | "storage" | "aiService">,
  input: { manualId: string; threadId: string; messages: ManualChatMessage[] },
): Promise<Response> {
  const userId = await deps.auth.requireUserId();
  const manual = await deps.manualRepository.findById({ userId, manualId: input.manualId });
  if (!manual) {
    throw new NotFoundError("Manual", input.manualId);
  }
  const product = await deps.productRepository.findById({ userId, productId: manual.productId });
  if (!product) {
    throw new NotFoundError("Product", manual.productId);
  }
  const file = await deps.storage.get(manual.fileKey);
  if (!file) {
    throw new Error(`Manual file missing from storage: ${manual.fileKey}`);
  }
  const pdf = await new Response(file.body).arrayBuffer();

  return deps.aiService.answerAboutManual({
    pdf,
    fileName: manual.fileName,
    productName: product.name,
    threadId: input.threadId,
    messages: input.messages,
  });
}
