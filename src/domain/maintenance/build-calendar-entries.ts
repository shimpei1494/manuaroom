import dayjs from "dayjs";

import type { MaintenanceLog } from "./maintenance-log";
import type { MaintenanceTask } from "./maintenance-task";

/** 目安 (次回予定 + 周期の繰り返し) を今日から何か月先まで出すか。docs/plan/maintenance-ux.md */
export const PROJECTION_MONTHS = 3;

/**
 * due: 次回予定日 / overdue: 期限超過 (今日のセルにまとめる) /
 * projected: 目安 (保存しない、表示のためだけの計算。ADR 0001) / done: 実施 / skipped: スキップ
 */
export type CalendarEntryKind = "due" | "overdue" | "projected" | "done" | "skipped";

export type CalendarEntry = {
  /** "YYYY-MM-DD" (呼び出し側のタイムゾーンでの日付) */
  day: string;
  kind: CalendarEntryKind;
  taskId: string;
};

type CalendarTask = Pick<MaintenanceTask, "id" | "nextDueDate" | "intervalValue" | "intervalUnit">;
type CalendarLog = Pick<MaintenanceLog, "taskId" | "kind" | "doneAt">;

/**
 * month を含む月のカレンダーに載せる予定と記録を組み立てる。日付は実行環境のタイムゾーンで数える。
 * 期限超過のタスクは本来の日ではなく今日に出す (今日がその月にあるときだけ)。
 * 目安は max(次回予定日, 今日) を起点に周期を足していき、今日から PROJECTION_MONTHS か月先までを出す。
 */
export function buildCalendarEntries(input: {
  tasks: CalendarTask[];
  logs: CalendarLog[];
  month: Date;
  today: Date;
  projectionMonths?: number;
}): CalendarEntry[] {
  const monthStart = dayjs(input.month).startOf("month");
  const inMonth = (d: dayjs.Dayjs) => d.isSame(monthStart, "month");
  const today = dayjs(input.today).startOf("day");
  const projectionEnd = today.add(input.projectionMonths ?? PROJECTION_MONTHS, "month");
  const entries: CalendarEntry[] = [];
  const push = (d: dayjs.Dayjs, kind: CalendarEntryKind, taskId: string) => {
    if (inMonth(d)) entries.push({ day: d.format("YYYY-MM-DD"), kind, taskId });
  };

  for (const task of input.tasks) {
    if (task.nextDueDate === null) continue;
    const due = dayjs(task.nextDueDate).startOf("day");
    const overdue = due.isBefore(today);
    push(overdue ? today : due, overdue ? "overdue" : "due", task.id);

    if (task.intervalValue === null || task.intervalUnit === null) continue;
    const base = overdue ? today : due;
    // 月末起点で日付がずれていかないよう、1 回ずつ足さずに起点から k 周期ぶん足す
    for (let k = 1; ; k++) {
      const next = base.add(task.intervalValue * k, task.intervalUnit);
      if (next.isAfter(projectionEnd)) break;
      push(next, "projected", task.id);
    }
  }

  for (const log of input.logs) {
    push(dayjs(log.doneAt).startOf("day"), log.kind, log.taskId);
  }
  return entries;
}
