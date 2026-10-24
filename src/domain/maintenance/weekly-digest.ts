import { DUE_SOON_DAYS } from "./classify-by-due-date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_MS = 24 * 60 * 60 * 1000;

/** 通知の「今日」「今週」を数えるタイムゾーン (家族は日本にいる) */
export const DIGEST_TIME_ZONE = "Asia/Tokyo";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DIGEST_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

export type DigestItem = {
  /** 製品が削除されていれば null */
  productName: string | null;
  title: string;
  dueDate: Date;
};

/**
 * 週 1 回の通知の本文。期限切れと、今日から DUE_SOON_DAYS 日以内に期限が来るものを載せる。
 * 日付は DIGEST_TIME_ZONE で数える (通知はサーバー = UTC で組み立てるため)。
 * 載せるものがなければ null を返し、呼び出し側は送らない。
 */
export function buildWeeklyDigest(input: { items: DigestItem[]; now: Date }): string | null {
  const today = calendarDay(input.now);
  const limit = today + DUE_SOON_DAYS;
  const withDay = input.items
    .flatMap((item) => {
      const day = calendarDay(item.dueDate);
      return day < limit ? [{ ...item, day }] : [];
    })
    .sort((a, b) => a.day - b.day);
  if (withDay.length === 0) return null;

  const label = (item: DigestItem) =>
    item.productName === null ? item.title : `${item.productName} ${item.title}`;
  const overdue = withDay.filter((item) => item.day < today);
  const thisWeek = withDay.filter((item) => item.day >= today);

  const lines = [`今週のメンテナンス（${formatDay(today)}〜${formatDay(limit - 1)}）`];
  if (overdue.length > 0) {
    lines.push("", `■ 期限切れ ${overdue.length.toString()}件`);
    for (const item of overdue) {
      const days = today - item.day;
      lines.push(`・${label(item)}（${formatDay(item.day)}、${days.toString()}日超過）`);
    }
  }
  if (thisWeek.length > 0) {
    lines.push("", `■ 今週 ${thisWeek.length.toString()}件`);
    for (const item of thisWeek) {
      lines.push(`・${label(item)}（${formatDay(item.day)} ${weekday(item.day)}）`);
    }
  }
  lines.push("", "完了・スキップはアプリから記録してください。");
  return lines.join("\n");
}

/**
 * DIGEST_TIME_ZONE でのその日付を、1970-01-01 からの日数で返す。
 * 実行環境のタイムゾーンに左右されないよう、Intl で年月日だけ取り出して UTC で数える。
 */
function calendarDay(date: Date): number {
  const parts = dateFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY_MS;
}

function formatDay(day: number): string {
  const date = new Date(day * DAY_MS);
  return `${(date.getUTCMonth() + 1).toString()}/${date.getUTCDate().toString()}`;
}

function weekday(day: number): string {
  return WEEKDAYS[new Date(day * DAY_MS).getUTCDay()] ?? "";
}
