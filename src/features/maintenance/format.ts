import dayjs from "dayjs";

import type { IntervalUnit } from "../../domain/maintenance/maintenance-task";

/** 周期の単位の表示名。「6月」だと 6 月に読めるので月は「か月」にする。 */
export const INTERVAL_UNIT_LABELS: Record<IntervalUnit, string> = {
  day: "日",
  week: "週間",
  month: "か月",
  year: "年",
};

export function formatInterval(value: number | null, unit: IntervalUnit | null): string {
  if (value === null || unit === null) return "—";
  return `${value.toString()}${INTERVAL_UNIT_LABELS[unit]}ごと`;
}

export function formatDate(value: Date | null): string {
  if (value === null) return "—";
  return dayjs(value).format("YYYY/MM/DD");
}

/** 期限までの残り日数。「今日」「あと3日」「5日超過」 */
export function formatDueLabel(dueDate: Date, today: Date): string {
  const days = dayjs(dueDate).startOf("day").diff(dayjs(today).startOf("day"), "day");
  if (days === 0) return "今日";
  return days > 0 ? `あと${days.toString()}日` : `${(-days).toString()}日超過`;
}
