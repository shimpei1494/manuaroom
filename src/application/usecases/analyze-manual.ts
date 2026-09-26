import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { Deps } from "../../infrastructure/deps";

/**
 * Manual を AI で解析し、メンテナンス候補を ai_suggestions に保存する。
 *
 * 挙動:
 * - ai_status を "analyzing" → 完了で "done" / 失敗で "error" に遷移
 * - 再解析時は古い ai_suggestions (pending/accepted/rejected すべて) を全削除して上書き (Q12)
 *   承認済み Maintenance Task は影響を受けない (既に独立したエンティティ)
 * - ローカル MVP では同期実行: ユーザーがタブを閉じてもサーバーは完走、再訪時に結果が見える
 */
export async function analyzeManual(deps: Deps, manualId: string): Promise<AiSuggestion[]> {
  const userId = await deps.auth.requireUserId();
  const manual = await deps.manualRepository.findById({ userId, manualId });
  if (!manual) {
    throw new Error(`Manual not found: ${manualId}`);
  }

  await deps.manualRepository.updateAiStatus({ userId, manualId, aiStatus: "analyzing" });

  try {
    const file = await deps.storage.get(manual.fileKey);
    if (!file) {
      throw new Error(`Manual file missing from storage: ${manual.fileKey}`);
    }
    const pdf = await new Response(file.body).arrayBuffer();

    const payloads = await deps.aiService.analyzeManualForMaintenance({
      pdf,
      fileName: manual.fileName,
    });

    const now = new Date();
    const suggestions: AiSuggestion[] = payloads.map((payload) => ({
      id: crypto.randomUUID(),
      userId,
      productId: manual.productId,
      manualId,
      type: "maintenance",
      payload,
      status: "pending",
      createdAt: now,
    }));

    await deps.aiSuggestionRepository.replaceByManual({ userId, manualId, suggestions });
    await deps.manualRepository.updateAiStatus({ userId, manualId, aiStatus: "done" });

    return suggestions;
  } catch (error) {
    await deps.manualRepository.updateAiStatus({ userId, manualId, aiStatus: "error" });
    throw error;
  }
}
