import { markMaintenanceDone } from "../../../src/application/usecases/mark-maintenance-done";
import { skipMaintenance } from "../../../src/application/usecases/skip-maintenance";
import { undoMaintenanceLog } from "../../../src/application/usecases/undo-maintenance-log";
import type { Operation, Scenario } from "./schedule-runner";

// A・B・C は同時に操作する人 (または、同じ人の連打)。実際のユースケースをそのまま呼ぶ。

const done = (who: string): Operation => ({
  name: `${who}が「完了」`,
  run: (deps, { taskId }) => markMaintenanceDone(deps, { taskId }),
});

const skip = (who: string): Operation => ({
  name: `${who}が「スキップ」`,
  run: (deps, { taskId }) => skipMaintenance(deps, { taskId }),
});

/** 画面に出ている「最後の記録」の「元に戻す」。準備で作った記録を指す。 */
const undoLatest = (who: string): Operation => ({
  name: `${who}が「元に戻す」`,
  run: (deps, { priorLogIds }) => undoMaintenanceLog(deps, { logId: priorLogIds[0] ?? "" }),
});

export const SCENARIOS: readonly Scenario[] = [
  // 対照: 1 人だけなら必ず通る。ここが破れたら、重なりではなくコードの変更が原因
  { title: "(対照) 完了を 1 人が押す", priorRecords: 0, operations: [done("A")] },
  { title: "(対照) 最後の記録の取り消しを 1 人が押す", priorRecords: 1, operations: [undoLatest("A")] },
  { title: "完了を 2 人 (連打) が同時に押す", priorRecords: 0, operations: [done("A"), done("B")] },
  {
    title: "完了を 3 人が同時に押す (やり直しが続く)",
    priorRecords: 0,
    operations: [done("A"), done("B"), done("C")],
  },
  {
    title: "完了とスキップが同時に押される",
    priorRecords: 0,
    operations: [done("A"), skip("B")],
  },
  {
    title: "スキップを 2 人 (連打) が同時に押す",
    priorRecords: 0,
    operations: [skip("A"), skip("B")],
  },
  {
    title: "最後の記録の取り消しと、完了が同時に押される",
    priorRecords: 1,
    operations: [undoLatest("A"), done("B")],
  },
  {
    title: "最後の記録の取り消しと、スキップが同時に押される",
    priorRecords: 1,
    operations: [undoLatest("A"), skip("B")],
  },
  {
    title: "同じ記録の取り消しを 2 人 (連打) が同時に押す",
    priorRecords: 1,
    operations: [undoLatest("A"), undoLatest("B")],
  },
  {
    title: "完了・スキップ・取り消しの 3 つが同時に押される",
    priorRecords: 1,
    operations: [done("A"), skip("B"), undoLatest("C")],
  },
];
