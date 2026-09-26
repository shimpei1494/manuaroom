import { NotFoundError } from "../../domain/errors";
import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../deps";

/**
 * AI Suggestion を承認して正式な Maintenance Task に昇格させる。
 * interval が両方定義されていれば次回予定日を今日基準で計算し、片方でも欠けていれば null。
 */
export async function acceptAiSuggestion(
  deps: Pick<Deps, "auth" | "clock" | "aiSuggestionRepository" | "maintenanceTaskRepository">,
  suggestionId: string,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();
  const suggestion = await deps.aiSuggestionRepository.findById({ userId, suggestionId });
  if (!suggestion) {
    throw new NotFoundError("AI suggestion", suggestionId);
  }
  if (suggestion.status !== "pending") {
    throw new Error(`AI suggestion is not pending: ${suggestionId} (status=${suggestion.status})`);
  }

  const { payload } = suggestion;
  const now = deps.clock.now();
  const nextDueDate =
    payload.intervalValue !== null && payload.intervalUnit !== null
      ? calculateNextDueDate(now, payload.intervalValue, payload.intervalUnit)
      : null;

  const task: MaintenanceTask = {
    id: crypto.randomUUID(),
    userId,
    productId: suggestion.productId,
    title: payload.title,
    intervalValue: payload.intervalValue,
    intervalUnit: payload.intervalUnit,
    nextDueDate,
    lastDoneAt: null,
    memo: payload.memo,
    url: payload.url,
    source: "ai",
    sourceManualId: suggestion.manualId,
    sourcePage: payload.sourcePage,
    createdAt: now,
    updatedAt: now,
  };

  await deps.maintenanceTaskRepository.create(task);
  await deps.aiSuggestionRepository.updateStatus({
    userId,
    suggestionId,
    status: "accepted",
  });

  return task;
}
