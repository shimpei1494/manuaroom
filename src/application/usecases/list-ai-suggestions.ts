import type { AiSuggestion } from "../../domain/ai-suggestion/ai-suggestion";
import type { Deps } from "../deps";

export async function listAiSuggestions(
  deps: Pick<Deps, "auth" | "aiSuggestionRepository">,
  manualId: string,
): Promise<AiSuggestion[]> {
  const userId = await deps.auth.requireUserId();
  return deps.aiSuggestionRepository.listByManual({ userId, manualId });
}
