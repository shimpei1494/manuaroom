import type { Deps } from "../../infrastructure/deps";

/**
 * Manual 削除フロー:
 * 1. DB から Manual を削除 (CASCADE で ai_suggestions も消える)
 *    関連 maintenance_tasks.source_manual_id は SET NULL (Q7-2: タスクは残す)
 * 2. ストレージから PDF を削除 (Q7-3: DB を先 → storage を後)
 */
export async function deleteManual(deps: Deps, manualId: string): Promise<void> {
  const userId = await deps.auth.requireUserId();
  const manual = await deps.manualRepository.findById({ userId, manualId });
  if (!manual) {
    throw new Error(`Manual not found: ${manualId}`);
  }
  await deps.manualRepository.delete({ userId, manualId });
  await deps.storage.delete(manual.fileKey);
}
