import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test";

import {
  makeAiSuggestion,
  makeMaintenanceTask,
  makeManual,
  makeProduct,
} from "../../../application/testing/fake-deps";
import type { AiSuggestion } from "../../../domain/ai-suggestion/ai-suggestion";
import { clearTables, startLocalCloudflareEnv } from "../../testing/local-cloudflare-env";
import { createDb, type Db } from "../client";
import { createAiSuggestionAcceptance } from "./ai-suggestion-acceptance";
import { createAiSuggestionRepository } from "./ai-suggestion-repository";
import { createMaintenanceTaskRepository } from "./maintenance-task-repository";
import { createManualRepository } from "./manual-repository";
import { createProductRepository } from "./product-repository";

// ローカル D1 (Miniflare) に対する結合テスト。batch の中で「pending のときだけ承認してタスクを作る」が
// 実物の D1 で働くこと、件数が多くても D1 の変数上限に当たらないことを確かめる。

const NOW = new Date("2026-07-01T00:00:00Z");

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

async function seedSuggestions(statuses: AiSuggestion["status"][]) {
  const product = makeProduct();
  const manual = makeManual({ userId: product.userId, productId: product.id });
  await createProductRepository(db).create(product);
  await createManualRepository(db).create(manual);
  const base = { userId: manual.userId, productId: product.id, manualId: manual.id };
  const suggestions = statuses.map((status) => makeAiSuggestion({ ...base, status }));
  await createAiSuggestionRepository(db).replaceByManual({ ...base, suggestions });
  return { base, suggestions };
}

function itemFor(suggestion: AiSuggestion) {
  return {
    suggestionId: suggestion.id,
    task: makeMaintenanceTask({
      userId: suggestion.userId,
      productId: suggestion.productId,
      title: suggestion.payload.title,
      intervalValue: 2,
      intervalUnit: "week",
      nextDueDate: new Date("2026-07-15T00:00:00Z"),
      source: "ai",
      sourceManualId: suggestion.manualId,
      sourcePage: 12,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  };
}

describe("aiSuggestionAcceptance.accept", () => {
  test("pending の候補だけを承認してタスクを作り、判断済みの候補は飛ばす", async () => {
    const { base, suggestions } = await seedSuggestions(["pending", "rejected", "pending"]);
    const items = suggestions.map(itemFor);

    const created = await createAiSuggestionAcceptance(db).accept({ userId: base.userId, items });

    expect(created).toEqual([items[0]?.task.id, items[2]?.task.id]);
    const stored = await createAiSuggestionRepository(db).listByManual(base);
    expect(Object.fromEntries(stored.map((s) => [s.id, s.status] as const))).toEqual({
      [suggestions[0]?.id ?? ""]: "accepted",
      [suggestions[1]?.id ?? ""]: "rejected",
      [suggestions[2]?.id ?? ""]: "accepted",
    });
    const tasks = await createMaintenanceTaskRepository(db).listByUser(base.userId);
    expect(tasks.map((t) => t.id).sort()).toEqual([...created].sort());
    expect(tasks.find((t) => t.id === items[0]?.task.id)).toEqual(items[0]?.task);
  });

  test("同じ候補を 2 回承認しても、タスクは 1 つしかできない", async () => {
    const { base, suggestions } = await seedSuggestions(["pending"]);
    const acceptance = createAiSuggestionAcceptance(db);
    const [suggestion] = suggestions;
    if (!suggestion) throw new Error("no suggestion");

    await acceptance.accept({ userId: base.userId, items: [itemFor(suggestion)] });
    const second = await acceptance.accept({ userId: base.userId, items: [itemFor(suggestion)] });

    expect(second).toEqual([]);
    expect(await createMaintenanceTaskRepository(db).listByUser(base.userId)).toHaveLength(1);
  });

  test("D1 の変数上限 (1 文 100 個) を超える件数でもまとめて承認できる", async () => {
    const { base, suggestions } = await seedSuggestions(
      Array.from({ length: 30 }, () => "pending"),
    );

    const created = await createAiSuggestionAcceptance(db).accept({
      userId: base.userId,
      items: suggestions.map(itemFor),
    });

    expect(created).toHaveLength(30);
    expect(await createMaintenanceTaskRepository(db).listByUser(base.userId)).toHaveLength(30);
  });
});
