import { describe, expect, test } from "vite-plus/test";

import { NotFoundError } from "../../domain/errors";
import { createFakeDeps, makeProduct } from "../testing/fake-deps";
import { createMaintenanceTask } from "./create-maintenance-task";

describe("createMaintenanceTask", () => {
  test("初回予定日を指定しなければ今日 + 周期", async () => {
    const deps = createFakeDeps({ now: new Date("2026-03-01T00:00:00Z") });
    const product = makeProduct();
    await deps.productRepository.create(product);

    const task = await createMaintenanceTask(deps, {
      productId: product.id,
      title: "フィルター掃除",
      intervalValue: 2,
      intervalUnit: "week",
    });

    expect(task.nextDueDate).toEqual(new Date("2026-03-15T00:00:00Z"));
    expect(task.source).toBe("manual");
    expect(await deps.maintenanceTaskRepository.listByUser(task.userId)).toEqual([task]);
  });

  test("初回予定日を指定したらそれを使う", async () => {
    const deps = createFakeDeps({ now: new Date("2026-03-01T00:00:00Z") });
    const product = makeProduct();
    await deps.productRepository.create(product);

    const task = await createMaintenanceTask(deps, {
      productId: product.id,
      title: "フィルター掃除",
      intervalValue: 2,
      intervalUnit: "week",
      initialDueDate: new Date("2026-03-05T00:00:00Z"),
    });

    expect(task.nextDueDate).toEqual(new Date("2026-03-05T00:00:00Z"));
  });

  test("周期も初回予定日もなければ予定日なし", async () => {
    const deps = createFakeDeps();
    const product = makeProduct();
    await deps.productRepository.create(product);

    const task = await createMaintenanceTask(deps, { productId: product.id, title: "点検" });

    expect(task.nextDueDate).toBeNull();
  });

  test("他のユーザーの製品には作れない", async () => {
    const deps = createFakeDeps();
    const product = makeProduct({ userId: "someone-else" });
    await deps.productRepository.create(product);

    await expect(
      createMaintenanceTask(deps, { productId: product.id, title: "点検" }),
    ).rejects.toThrow(NotFoundError);
  });
});
