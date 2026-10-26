import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import { makeMaintenanceTask, makeProduct } from "../../../application/testing/fake-deps";
import type { MaintenanceLog } from "../../../domain/maintenance/maintenance-log";
import { clearTables, startLocalCloudflareEnv } from "../../testing/local-cloudflare-env";
import { createDb, type Db } from "../client";
import { createMaintenanceLedger } from "./maintenance-ledger";
import { createMaintenanceLogRepository } from "./maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./maintenance-task-repository";
import { createProductRepository } from "./product-repository";

// ローカル D1 (Miniflare) に対する結合テスト。batch の中で「読んだ時点から変わっていなければ書く」が
// 実物の D1 で働くことを確かめる (ADR 0009)。操作の組み合わせはユースケースのテストと検証スキルが見る。

const READ_AT = new Date("2026-07-01T00:00:00Z");
const NEXT_DUE = new Date("2026-07-10T00:00:00Z");
const LAST_DONE = new Date("2026-06-10T00:00:00Z");
const AFTER = new Date("2026-07-20T00:00:00Z");

let d1: D1Database;
let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const local = await startLocalCloudflareEnv();
  d1 = local.env.DB;
  db = createDb(d1);
  dispose = local.dispose;
});

afterAll(async () => {
  await dispose();
});

beforeEach(async () => {
  await clearTables(d1);
});

async function seedTask() {
  const product = makeProduct();
  const task = makeMaintenanceTask({
    userId: product.userId,
    productId: product.id,
    nextDueDate: NEXT_DUE,
    lastDoneAt: LAST_DONE,
    updatedAt: READ_AT,
  });
  await createProductRepository(db).create(product);
  await createMaintenanceTaskRepository(db).create(task);
  return task;
}

function makeLog(task: { id: string; userId: string }): MaintenanceLog {
  return {
    id: crypto.randomUUID(),
    userId: task.userId,
    taskId: task.id,
    kind: "done",
    doneAt: AFTER,
    memo: "メモ",
    previousTaskState: { nextDueDate: NEXT_DUE, lastDoneAt: null },
    createdAt: AFTER,
  };
}

describe("maintenanceLedger.appendLog", () => {
  test("読んだ時点から変わっていなければ、記録を足してタスクを更新する", async () => {
    const task = await seedTask();
    const log = makeLog(task);
    const updated = { ...task, nextDueDate: AFTER, lastDoneAt: AFTER, updatedAt: AFTER };

    const written = await createMaintenanceLedger(db).appendLog({
      task: updated,
      readUpdatedAt: READ_AT,
      log,
    });

    expect(written).toBe(true);
    const stored = await createMaintenanceTaskRepository(db).findById({
      userId: task.userId,
      taskId: task.id,
    });
    expect(stored).toEqual(updated);
    expect(
      await createMaintenanceLogRepository(db).findById({ userId: task.userId, logId: log.id }),
    ).toEqual(log);
  });

  test("読んだあとにタスクが更新されていたら、記録もタスクも書かない", async () => {
    const task = await seedTask();
    const ledger = createMaintenanceLedger(db);
    const first = makeLog(task);
    await ledger.appendLog({
      task: { ...task, nextDueDate: AFTER, updatedAt: AFTER },
      readUpdatedAt: READ_AT,
      log: first,
    });
    const second = makeLog(task);

    // 同じ時点 (READ_AT) を読んだ 2 つ目の操作。先に 1 つ目が書いているので書けない
    const written = await ledger.appendLog({
      task: { ...task, nextDueDate: new Date("2026-08-01T00:00:00Z"), updatedAt: AFTER },
      readUpdatedAt: READ_AT,
      log: second,
    });

    expect(written).toBe(false);
    const logRepo = createMaintenanceLogRepository(db);
    expect(await logRepo.findById({ userId: task.userId, logId: second.id })).toBeNull();
    expect(await logRepo.listByTask({ userId: task.userId, taskId: task.id })).toEqual([first]);
    const stored = await createMaintenanceTaskRepository(db).findById({
      userId: task.userId,
      taskId: task.id,
    });
    expect(stored?.nextDueDate).toEqual(AFTER);
  });

  test("他のユーザーのタスクには書けない", async () => {
    const task = await seedTask();
    const log = makeLog(task);

    const written = await createMaintenanceLedger(db).appendLog({
      task: { ...task, userId: "other-user", nextDueDate: AFTER, updatedAt: AFTER },
      readUpdatedAt: READ_AT,
      log: { ...log, userId: "other-user" },
    });

    expect(written).toBe(false);
    expect(
      await createMaintenanceLogRepository(db).listByTask({
        userId: "other-user",
        taskId: task.id,
      }),
    ).toEqual([]);
  });
});

describe("maintenanceLedger.revertLog", () => {
  test("読んだ時点から変わっていなければ、記録を消してタスクを更新する", async () => {
    const task = await seedTask();
    const ledger = createMaintenanceLedger(db);
    const log = makeLog(task);
    await ledger.appendLog({
      task: { ...task, nextDueDate: AFTER, updatedAt: AFTER },
      readUpdatedAt: READ_AT,
      log,
    });
    const restored = { ...task, updatedAt: new Date("2026-07-21T00:00:00Z") };

    const written = await ledger.revertLog({ task: restored, readUpdatedAt: AFTER, logId: log.id });

    expect(written).toBe(true);
    expect(
      await createMaintenanceLogRepository(db).findById({ userId: task.userId, logId: log.id }),
    ).toBeNull();
    expect(
      await createMaintenanceTaskRepository(db).findById({
        userId: task.userId,
        taskId: task.id,
      }),
    ).toEqual(restored);
  });

  test("読んだあとにタスクが更新されていたら、記録を消さずタスクも書かない", async () => {
    const task = await seedTask();
    const ledger = createMaintenanceLedger(db);
    const log = makeLog(task);
    await ledger.appendLog({
      task: { ...task, nextDueDate: AFTER, updatedAt: AFTER },
      readUpdatedAt: READ_AT,
      log,
    });

    // READ_AT のまま (古い) 読み取りで取り消そうとする
    const written = await ledger.revertLog({
      task: { ...task, updatedAt: new Date("2026-07-21T00:00:00Z") },
      readUpdatedAt: READ_AT,
      logId: log.id,
    });

    expect(written).toBe(false);
    expect(
      await createMaintenanceLogRepository(db).findById({ userId: task.userId, logId: log.id }),
    ).toEqual(log);
    const stored = await createMaintenanceTaskRepository(db).findById({
      userId: task.userId,
      taskId: task.id,
    });
    expect(stored?.nextDueDate).toEqual(AFTER);
  });
});
