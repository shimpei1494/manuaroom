import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import {
  makeAiSuggestion,
  makeMaintenanceTask,
  makeManual,
  makeProduct,
} from "../../../application/testing/fake-deps";
import type { MaintenanceLog } from "../../../domain/maintenance/maintenance-log";
import { clearTables, startLocalCloudflareEnv } from "../../testing/local-cloudflare-env";
import { createDb, type Db } from "../client";
import { createAiSuggestionRepository } from "./ai-suggestion-repository";
import { createMaintenanceLogRepository } from "./maintenance-log-repository";
import { createMaintenanceTaskRepository } from "./maintenance-task-repository";
import { createManualRepository } from "./manual-repository";
import { createProductRepository } from "./product-repository";

// ローカル D1 (Miniflare) に対する結合テスト。ユーザー単位の絞り込みと、
// D1 固有の書き方 (batch) が正しく動くことだけを確かめる (docs/testing.md)。

const OTHER_USER_ID = "other-user";

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

describe("productRepository", () => {
  test("他のユーザーの製品は一覧にも ID 指定にも出てこない", async () => {
    const repo = createProductRepository(db);
    const mine = makeProduct({ name: "自分のエアコン" });
    const others = makeProduct({ userId: OTHER_USER_ID, name: "他人のエアコン" });
    await repo.create(mine);
    await repo.create(others);

    const list = await repo.listByUser(mine.userId);

    expect(list.map((p) => p.id)).toEqual([mine.id]);
    expect(await repo.findById({ userId: mine.userId, productId: others.id })).toBeNull();
  });

  test("日付は Date のまま保存・復元される", async () => {
    const repo = createProductRepository(db);
    const product = makeProduct({ purchaseDate: new Date("2025-04-01T00:00:00Z") });
    await repo.create(product);

    const found = await repo.findById({ userId: product.userId, productId: product.id });

    expect(found?.purchaseDate).toEqual(new Date("2025-04-01T00:00:00Z"));
  });
});

describe("aiSuggestionRepository.replaceByManual", () => {
  async function seedManual(userId?: string) {
    const product = makeProduct(userId ? { userId } : {});
    const manual = makeManual({ userId: product.userId, productId: product.id });
    await createProductRepository(db).create(product);
    await createManualRepository(db).create(manual);
    return { product, manual };
  }

  test("同じ説明書の既存の候補を消して新しい候補に置き換える (Q12)", async () => {
    const repo = createAiSuggestionRepository(db);
    const { product, manual } = await seedManual();
    const base = { userId: manual.userId, productId: product.id, manualId: manual.id };
    await repo.replaceByManual({ ...base, suggestions: [makeAiSuggestion(base)] });

    const next = [makeAiSuggestion(base), makeAiSuggestion(base)];
    await repo.replaceByManual({ ...base, suggestions: next });

    const list = await repo.listByManual({ userId: manual.userId, manualId: manual.id });
    expect(list.map((s) => s.id).sort()).toEqual(next.map((s) => s.id).sort());
  });

  test("空の候補で置き換えると既存の候補がなくなる", async () => {
    const repo = createAiSuggestionRepository(db);
    const { product, manual } = await seedManual();
    const base = { userId: manual.userId, productId: product.id, manualId: manual.id };
    await repo.replaceByManual({ ...base, suggestions: [makeAiSuggestion(base)] });

    await repo.replaceByManual({ ...base, suggestions: [] });

    expect(await repo.listByManual({ userId: manual.userId, manualId: manual.id })).toEqual([]);
  });

  test("他のユーザーの候補は消さない", async () => {
    const repo = createAiSuggestionRepository(db);
    const { product, manual } = await seedManual(OTHER_USER_ID);
    const others = makeAiSuggestion({
      userId: OTHER_USER_ID,
      productId: product.id,
      manualId: manual.id,
    });
    await repo.replaceByManual({
      userId: OTHER_USER_ID,
      manualId: manual.id,
      suggestions: [others],
    });

    await repo.replaceByManual({ userId: "local-user", manualId: manual.id, suggestions: [] });

    const list = await repo.listByManual({ userId: OTHER_USER_ID, manualId: manual.id });
    expect(list.map((s) => s.id)).toEqual([others.id]);
  });
});

describe("maintenanceLogRepository.listByKind", () => {
  async function seedTask(userId?: string) {
    const product = makeProduct(userId ? { userId } : {});
    const task = makeMaintenanceTask({ userId: product.userId, productId: product.id });
    await createProductRepository(db).create(product);
    await createMaintenanceTaskRepository(db).create(task);
    return task;
  }

  function makeLog(
    task: { id: string; userId: string },
    kind: MaintenanceLog["kind"],
  ): MaintenanceLog {
    const at = new Date("2026-07-20T00:00:00Z");
    return {
      id: crypto.randomUUID(),
      userId: task.userId,
      taskId: task.id,
      kind,
      doneAt: at,
      memo: null,
      createdAt: at,
    };
  }

  test("指定した種類のログだけを、自分のタスクの分だけ返す (ADR 0006)", async () => {
    const repo = createMaintenanceLogRepository(db);
    const [mine, others] = await Promise.all([seedTask(), seedTask(OTHER_USER_ID)]);
    const skipped = makeLog(mine, "skipped");
    await Promise.all([
      repo.create(skipped),
      repo.create(makeLog(mine, "done")),
      repo.create(makeLog(others, "skipped")),
    ]);

    const logs = await repo.listByKind({ userId: mine.userId, kind: "skipped" });

    expect(logs).toEqual([skipped]);
  });
});
