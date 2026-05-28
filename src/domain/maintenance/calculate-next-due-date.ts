import dayjs from "dayjs";

import type { IntervalUnit } from "./maintenance-task";

/**
 * 完了日基準で次回予定日を算出する (ADR-0001)。
 * カレンダー固定ではなく「最後に完了した日 + interval」を採用しているため、
 * 遅延した場合は次回もその分後ろ倒しになる。
 */
export function calculateNextDueDate(
  completedAt: Date,
  intervalValue: number,
  intervalUnit: IntervalUnit,
): Date {
  if (!Number.isInteger(intervalValue) || intervalValue <= 0) {
    throw new Error(`intervalValue must be a positive integer, got ${String(intervalValue)}`);
  }
  return dayjs(completedAt).add(intervalValue, intervalUnit).toDate();
}
