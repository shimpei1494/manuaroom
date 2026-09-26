import type { Deps } from "../../infrastructure/deps";

export async function rejectAiSuggestion(deps: Deps, suggestionId: string): Promise<void> {
  const userId = await deps.auth.requireUserId();
  const suggestion = await deps.aiSuggestionRepository.findById({ userId, suggestionId });
  if (!suggestion) {
    throw new Error(`AI suggestion not found: ${suggestionId}`);
  }
  if (suggestion.status !== "pending") {
    throw new Error(`AI suggestion is not pending: ${suggestionId} (status=${suggestion.status})`);
  }
  await deps.aiSuggestionRepository.updateStatus({
    userId,
    suggestionId,
    status: "rejected",
  });
}
