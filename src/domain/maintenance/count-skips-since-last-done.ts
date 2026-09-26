import type { MaintenanceLog } from "./maintenance-log";

/**
 * 最後に実施してから何回続けてスキップしているか (ADR 0006)。
 * 回数は保存せず、最終実施日より後の skipped ログを数える。一度も実施していなければ全件。
 */
export function countSkipsSinceLastDone(logs: MaintenanceLog[], lastDoneAt: Date | null): number {
  return logs.filter(
    (log) =>
      log.kind === "skipped" &&
      (lastDoneAt === null || log.doneAt.getTime() > lastDoneAt.getTime()),
  ).length;
}
