import { describe, expect, test } from "vite-plus/test";

import { BusinessRuleError } from "../../domain/errors";
import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { MaintenanceLedgerPort } from "../ports/maintenance-ledger-port";
import { createFakeDeps, makeMaintenanceTask } from "../testing/fake-deps";
import { markMaintenanceDone } from "./mark-maintenance-done";
import { retryOnConflict } from "./retry-on-conflict";
import { skipMaintenance } from "./skip-maintenance";
import { undoMaintenanceLog } from "./undo-maintenance-log";

/** 最初の conflicts 回は「他の操作が先に書いた」として書かせず、その間に別の操作を割り込ませる。 */
function withConflicts(
  ledger: MaintenanceLedgerPort,
  conflicts: number,
  interleave: () => Promise<unknown>,
): MaintenanceLedgerPort {
  let remaining = conflicts;
  const conflict = async () => {
    remaining -= 1;
    await interleave();
    return false;
  };
  return {
    appendLog: (input) => (remaining > 0 ? conflict() : ledger.appendLog(input)),
    revertLog: (input) => (remaining > 0 ? conflict() : ledger.revertLog(input)),
  };
}

function setup() {
  const deps = createFakeDeps({ now: new Date("2026-07-20T00:00:00Z") });
  const task = makeMaintenanceTask({
    intervalValue: 1,
    intervalUnit: "week",
    nextDueDate: new Date("2026-07-10T00:00:00Z"),
    lastDoneAt: new Date("2026-07-03T00:00:00Z"),
  });
  return { deps, task };
}

function previousLastDoneDates(logs: readonly MaintenanceLog[]): (string | undefined)[] {
  return logs
    .map((log) => log.previousTaskState?.lastDoneAt?.toISOString())
    .sort((a, b) => (a ?? "").localeCompare(b ?? ""));
}

describe("retryOnConflict", () => {
  test("書けるまで読み直すところからやり直し、書けた結果を返す", async () => {
    let calls = 0;

    const result = await retryOnConflict(() => {
      calls += 1;
      return Promise.resolve(calls < 3 ? null : "書けた");
    });

    expect(result).toBe("書けた");
    expect(calls).toBe(3);
  });

  test("何度やり直しても重なるときは、画面に出せる文のエラーで終わる", async () => {
    let calls = 0;

    const run = retryOnConflict(() => {
      calls += 1;
      return Promise.resolve(null);
    });

    await expect(run).rejects.toThrow(BusinessRuleError);
    expect(calls).toBe(5);
  });
});

describe("記録の追加・取り消しが他の操作と重なったとき", () => {
  test("完了: 先に別の完了が入ったら、その結果を読み直して続きから記録する", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const racing = {
      ...deps,
      maintenanceLedger: withConflicts(deps.maintenanceLedger, 1, () =>
        markMaintenanceDone(deps, { taskId: task.id }),
      ),
    };

    await markMaintenanceDone(racing, { taskId: task.id });

    const logs = await deps.maintenanceLogRepository.listByTask({
      userId: task.userId,
      taskId: task.id,
    });
    // 戻し先は 1 件目が最初の状態、2 件目が 1 件目の完了のあとの状態 (どちらも最初の状態ではない)
    expect(previousLastDoneDates(logs)).toEqual([
      task.lastDoneAt?.toISOString(),
      "2026-07-20T00:00:00.000Z",
    ]);
  });

  test("スキップ: 先に別のスキップが入っても、2 件とも記録され、戻し先がつながる", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const racing = {
      ...deps,
      maintenanceLedger: withConflicts(deps.maintenanceLedger, 1, () =>
        skipMaintenance(deps, { taskId: task.id }),
      ),
    };

    await skipMaintenance(racing, { taskId: task.id });

    const logs = await deps.maintenanceLogRepository.listByTask({
      userId: task.userId,
      taskId: task.id,
    });
    // 戻し先は 1 件目が最初の予定日、2 件目が 1 件目のスキップのあとの予定日 (今日 + 1 週間)
    const previousDueDates = logs
      .map((log) => log.previousTaskState?.nextDueDate?.toISOString())
      .sort((a, b) => (a ?? "").localeCompare(b ?? ""));
    expect(previousDueDates).toEqual([task.nextDueDate?.toISOString(), "2026-07-27T00:00:00.000Z"]);
  });

  test("取り消し: 取り消す前に新しい記録が入ったら、最後の記録ではなくなったとして断る", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });
    deps.setNow(new Date("2026-07-21T00:00:00Z"));
    const racing = {
      ...deps,
      maintenanceLedger: withConflicts(deps.maintenanceLedger, 1, () =>
        markMaintenanceDone(deps, { taskId: task.id }),
      ),
    };

    const run = undoMaintenanceLog(racing, { logId: log.id });

    await expect(run).rejects.toThrow("取り消せるのは最後に記録したものだけです");
    expect(
      await deps.maintenanceLogRepository.findById({ userId: task.userId, logId: log.id }),
    ).not.toBeNull();
  });

  test("取り消し: 取り消す前に同じ記録が別の操作で消えたら、見つからないとして終わる", async () => {
    const { deps, task } = setup();
    await deps.maintenanceTaskRepository.create(task);
    const { log } = await markMaintenanceDone(deps, { taskId: task.id });
    const racing = {
      ...deps,
      maintenanceLedger: withConflicts(deps.maintenanceLedger, 1, () =>
        undoMaintenanceLog(deps, { logId: log.id }),
      ),
    };

    const run = undoMaintenanceLog(racing, { logId: log.id });

    await expect(run).rejects.toThrow("Maintenance log not found");
  });
});
