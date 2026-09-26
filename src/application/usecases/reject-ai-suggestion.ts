import { NotFoundError } from "../../domain/errors";
import type { Deps } from "../deps";

export async function rejectAiSuggestion(
  deps: Pick<Deps, "auth" | "aiSuggestionRepository">,
  suggestionId: string,
): Promise<void> {
  const userId = await deps.auth.requireUserId();
  const suggestion = await deps.aiSuggestionRepository.findById({ userId, suggestionId });
  if (!suggestion) {
    throw new NotFoundError("AI suggestion", suggestionId);
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
