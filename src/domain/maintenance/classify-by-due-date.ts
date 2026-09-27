import dayjs from "dayjs";

/** 「今やること」に出す範囲 (今日から何日以内か)。docs/plan/maintenance-ux.md */
export const DUE_SOON_DAYS = 7;
const DUE_THIS_MONTH_DAYS = 30;

type HasDueDate = { nextDueDate: Date | null };

export type DueDateGroups<T> = {
  overdue: T[];
  thisWeek: T[];
  nextMonth: T[];
  later: T[];
  noDate: T[];
};

/**
 * 次回予定日で「期限超過 / 7 日以内 / 30 日以内 / それ以降 / 予定なし」に分ける。
 * 日付は today のタイムゾーンでの日単位で比べ、各グループは期限の近い順に並べる。
 */
export function classifyByDueDate<T extends HasDueDate>(tasks: T[], today: Date): DueDateGroups<T> {
  const start = dayjs(today).startOf("day");
  const soonLimit = start.add(DUE_SOON_DAYS, "day");
  const monthLimit = start.add(DUE_THIS_MONTH_DAYS, "day");
  const groups: DueDateGroups<T> = {
    overdue: [],
    thisWeek: [],
    nextMonth: [],
    later: [],
    noDate: [],
  };

  for (const task of sortByDueDate(tasks)) {
    if (task.nextDueDate === null) {
      groups.noDate.push(task);
      continue;
    }
    const due = dayjs(task.nextDueDate).startOf("day");
    if (due.isBefore(start)) groups.overdue.push(task);
    else if (due.isBefore(soonLimit)) groups.thisWeek.push(task);
    else if (due.isBefore(monthLimit)) groups.nextMonth.push(task);
    else groups.later.push(task);
  }
  return groups;
}

/** 今対応すべきタスク (期限超過と今日から 7 日以内)。期限の近い順。 */
export function selectTasksToDoNow<T extends HasDueDate>(tasks: T[], today: Date): T[] {
  const { overdue, thisWeek } = classifyByDueDate(tasks, today);
  return [...overdue, ...thisWeek];
}

/** 今やることがないときに「次は 〇/〇」と見せる 1 件。予定のあるタスクがなければ null。 */
export function findNextUpcoming<T extends HasDueDate>(tasks: T[], today: Date): T | null {
  const { nextMonth, later } = classifyByDueDate(tasks, today);
  return nextMonth[0] ?? later[0] ?? null;
}

function sortByDueDate<T extends HasDueDate>(tasks: T[]): T[] {
  return tasks
    .filter((t) => t.nextDueDate !== null)
    .sort((a, b) => (a.nextDueDate?.getTime() ?? 0) - (b.nextDueDate?.getTime() ?? 0))
    .concat(tasks.filter((t) => t.nextDueDate === null));
}
