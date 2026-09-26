import dayjs from "dayjs";

/** 「最終実施 2026/01/10（190日前）」の日付部分。どれだけ放置しているかを見せる (ADR 0006)。 */
export function formatLastDone(lastDoneAt: Date | null, today: Date): string {
  if (lastDoneAt === null) return "—";
  const date = dayjs(lastDoneAt);
  const days = dayjs(today).startOf("day").diff(date.startOf("day"), "day");
  return `${date.format("YYYY/MM/DD")}（${days === 0 ? "今日" : `${days.toString()}日前`}）`;
}
