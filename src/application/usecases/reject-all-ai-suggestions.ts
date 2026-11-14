import type { Deps } from "../deps";

/**
 * 説明書の未判断 (pending) の AI Suggestion をまとめて却下する。
 * 判断済みの候補には触らない。却下した件数を返す。
 */
export async function rejectAllAiSuggestions(
  deps: Pick<Deps, "auth" | "aiSuggestionRepository">,
  manualId: string,
): Promise<number> {
  const userId = await deps.auth.requireUserId();
  return deps.aiSuggestionRepository.rejectPendingByManual({ userId, manualId });
}
