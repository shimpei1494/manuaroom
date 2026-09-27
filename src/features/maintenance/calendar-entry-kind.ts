import type { CalendarEntryKind } from "../../domain/maintenance/build-calendar-entries";

/** カレンダーでの表示名と色。並び順は日付を開いたときの一覧の順。 */
export const CALENDAR_ENTRY_KINDS: { kind: CalendarEntryKind; label: string; color: string }[] = [
  { kind: "overdue", label: "期限超過", color: "red" },
  { kind: "due", label: "予定", color: "blue" },
  { kind: "done", label: "実施", color: "green" },
  { kind: "skipped", label: "スキップ", color: "yellow" },
  { kind: "projected", label: "目安", color: "gray" },
];

export function calendarEntryKindStyle(kind: CalendarEntryKind) {
  const found = CALENDAR_ENTRY_KINDS.find((k) => k.kind === kind);
  if (!found) throw new Error(`unknown calendar entry kind: ${kind}`);
  return found;
}
