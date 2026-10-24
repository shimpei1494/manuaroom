import { describe, expect, test } from "vite-plus/test";

import { createFakeDeps, makeMaintenanceTask, makeProduct } from "../testing/fake-deps";
import { sendWeeklyDigest } from "./send-weekly-digest";

describe("sendWeeklyDigest", () => {
  test("自分のタスクのうち今週までのものを製品名付きで 1 通にまとめて送る", async () => {
    const deps = createFakeDeps({ now: new Date("2026-10-03T00:00:00Z") });
    const product = makeProduct({ name: "洗濯機" });
    await Promise.all([
      deps.productRepository.create(product),
      deps.maintenanceTaskRepository.create(
        makeMaintenanceTask({
          productId: product.id,
          title: "槽洗浄",
          nextDueDate: new Date("2026-10-05T00:00:00Z"),
        }),
      ),
      deps.maintenanceTaskRepository.create(
        makeMaintenanceTask({ title: "予定なし", nextDueDate: null }),
      ),
      deps.maintenanceTaskRepository.create(
        makeMaintenanceTask({
          userId: "someone-else",
          title: "他人のタスク",
          nextDueDate: new Date("2026-10-04T00:00:00Z"),
        }),
      ),
    ]);

    const result = await sendWeeklyDigest(deps);

    expect(result).toEqual({ sent: true });
    expect(deps.sentNotifications).toHaveLength(1);
    expect(deps.sentNotifications[0]).toContain("・洗濯機 槽洗浄（10/5 月）");
    expect(deps.sentNotifications[0]).not.toContain("他人のタスク");
  });

  test("今週までに期限のタスクがなければ送らない", async () => {
    const deps = createFakeDeps({ now: new Date("2026-10-03T00:00:00Z") });
    await deps.maintenanceTaskRepository.create(
      makeMaintenanceTask({ nextDueDate: new Date("2026-12-01T00:00:00Z") }),
    );

    const result = await sendWeeklyDigest(deps);

    expect(result).toEqual({ sent: false });
    expect(deps.sentNotifications).toEqual([]);
  });
});
