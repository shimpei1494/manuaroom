import { suggestionToTask } from "../../domain/ai-suggestion/suggestion-to-task";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../deps";

/**
 * 説明書の未判断 (pending) の AI Suggestion をまとめて承認し、Maintenance Task にする。
 * 判断済みの候補には触らない。作ったタスクを返す。
 */
export async function acceptAllAiSuggestions(
  deps: Pick<Deps, "auth" | "clock" | "aiSuggestionRepository" | "aiSuggestionAcceptance">,
  manualId: string,
): Promise<MaintenanceTask[]> {
  const userId = await deps.auth.requireUserId();
  const suggestions = await deps.aiSuggestionRepository.listByManual({ userId, manualId });
  const pending = suggestions.filter((s) => s.status === "pending");
  if (pending.length === 0) return [];

  const now = deps.clock.now();
  const items = pending.map((suggestion) => ({
    suggestionId: suggestion.id,
    task: suggestionToTask({ suggestion, taskId: crypto.randomUUID(), now }),
  }));
  const createdIds = new Set(await deps.aiSuggestionAcceptance.accept({ userId, items }));
  return items.filter(({ task }) => createdIds.has(task.id)).map(({ task }) => task);
}
