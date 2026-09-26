import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { Deps } from "../../infrastructure/deps";

export async function listAiSuggestions(deps: Deps, manualId: string): Promise<AiSuggestion[]> {
  const userId = await deps.auth.requireUserId();
  return deps.aiSuggestionRepository.listByManual({ userId, manualId });
}
