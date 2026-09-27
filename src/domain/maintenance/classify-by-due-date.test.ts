import { describe, expect, test } from "vite-plus/test";

import { classifyByDueDate, findNextUpcoming, selectTasksToDoNow } from "./classify-by-due-date";

const today = new Date("2026-07-20T10:00:00");

function task(id: string, due: string | null) {
  return { id, nextDueDate: due === null ? null : new Date(due) };
}

describe("classifyByDueDate", () => {
  test("期限超過・7 日以内・30 日以内・それ以降・予定なしに分ける", () => {
    const groups = classifyByDueDate(
      [
        task("overdue", "2026-07-19T00:00:00"),
        task("today", "2026-07-20T00:00:00"),
        task("day6", "2026-07-26T00:00:00"),
        task("day7", "2026-07-27T00:00:00"),
        task("day29", "2026-08-18T00:00:00"),
        task("day30", "2026-08-19T00:00:00"),
        task("none", null),
      ],
      today,
    );

    expect(groups.overdue.map((t) => t.id)).toEqual(["overdue"]);
    expect(groups.thisWeek.map((t) => t.id)).toEqual(["today", "day6"]);
    expect(groups.nextMonth.map((t) => t.id)).toEqual(["day7", "day29"]);
    expect(groups.later.map((t) => t.id)).toEqual(["day30"]);
    expect(groups.noDate.map((t) => t.id)).toEqual(["none"]);
  });

  test("各グループは期限の近い順に並べる", () => {
    const groups = classifyByDueDate(
      [task("b", "2026-07-10T00:00:00"), task("a", "2026-07-01T00:00:00")],
      today,
    );

    expect(groups.overdue.map((t) => t.id)).toEqual(["a", "b"]);
  });
});

describe("selectTasksToDoNow", () => {
  test("期限超過と今日から 7 日以内だけを期限の近い順に返す", () => {
    const tasks = [
      task("week", "2026-07-25T00:00:00"),
      task("later", "2026-09-01T00:00:00"),
      task("overdue", "2026-07-01T00:00:00"),
      task("none", null),
    ];

    expect(selectTasksToDoNow(tasks, today).map((t) => t.id)).toEqual(["overdue", "week"]);
  });
});

describe("findNextUpcoming", () => {
  test("今やることがないとき、次に来るタスクを 1 件返す", () => {
    const tasks = [
      task("far", "2026-12-01T00:00:00"),
      task("near", "2026-08-10T00:00:00"),
      task("none", null),
    ];

    expect(findNextUpcoming(tasks, today)?.id).toBe("near");
  });

  test("予定のあるタスクがなければ null", () => {
    expect(findNextUpcoming([task("none", null)], today)).toBeNull();
  });
});
