import type { Deps } from "../deps";

/**
 * Product 削除フロー:
 * 1. 紐づく Manual の file_key を全て先に取得する
 * 2. Product を削除 (DB CASCADE で manuals/tasks/logs/ai_suggestions も消える)
 * 3. ストレージから PDF を削除 (Q7-3: DB を先 → storage を後)
 */
export async function deleteProduct(
  deps: Pick<Deps, "auth" | "manualRepository" | "productRepository" | "storage">,
  productId: string,
): Promise<void> {
  const userId = await deps.auth.requireUserId();
  const manuals = await deps.manualRepository.listByProduct({ userId, productId });
  await deps.productRepository.delete({ userId, productId });
  await Promise.all(manuals.map((manual) => deps.storage.delete(manual.fileKey)));
}
