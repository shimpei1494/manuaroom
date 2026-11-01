import { suggestionToTask } from "../../domain/ai-suggestion/suggestion-to-task";
import { NotFoundError } from "../../domain/errors";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../deps";

/** AI Suggestion を承認して正式な Maintenance Task に昇格させる。 */
export async function acceptAiSuggestion(
  deps: Pick<Deps, "auth" | "clock" | "aiSuggestionRepository" | "aiSuggestionAcceptance">,
  suggestionId: string,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();
  const suggestion = await deps.aiSuggestionRepository.findById({ userId, suggestionId });
  if (!suggestion) {
    throw new NotFoundError("AI suggestion", suggestionId);
  }
  const notPending = () =>
    new Error(`AI suggestion is not pending: ${suggestionId} (status=${suggestion.status})`);
  if (suggestion.status !== "pending") {
    throw notPending();
  }

  const task = suggestionToTask({ suggestion, taskId: crypto.randomUUID(), now: deps.clock.now() });
  const created = await deps.aiSuggestionAcceptance.accept({
    userId,
    items: [{ suggestionId, task }],
  });
  // 読んでから書くまでの間に、他の操作 (一括承認・却下・二度押し) が先に判断した
  if (created.length === 0) {
    throw notPending();
  }
  return task;
}
