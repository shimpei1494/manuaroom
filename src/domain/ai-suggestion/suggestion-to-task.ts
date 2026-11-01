import { calculateNextDueDate } from "../maintenance/calculate-next-due-date";
import type { MaintenanceTask } from "../maintenance/maintenance-task";
import type { AiSuggestion } from "./ai-suggestion";

/**
 * 承認した AI Suggestion から Maintenance Task を作る。
 * interval が両方定義されていれば次回予定日を今日基準で計算し、片方でも欠けていれば null。
 */
export function suggestionToTask(input: {
  suggestion: AiSuggestion;
  taskId: string;
  now: Date;
}): MaintenanceTask {
  const { suggestion, taskId, now } = input;
  const { payload } = suggestion;
  const nextDueDate =
    payload.intervalValue !== null && payload.intervalUnit !== null
      ? calculateNextDueDate(now, payload.intervalValue, payload.intervalUnit)
      : null;
  return {
    id: taskId,
    userId: suggestion.userId,
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
}
