import { buildWeeklyDigest } from "../../domain/maintenance/weekly-digest";
import type { Deps } from "../deps";

export type SendWeeklyDigestResult = { sent: boolean };

/**
 * 期限切れと今週期限のタスクをまとめて家族に知らせる (毎週の Cron から呼ぶ)。
 * 知らせるものがない週は送らない (LINE の無料枠を使わないため)。
 */
export async function sendWeeklyDigest(
  deps: Pick<
    Deps,
    "auth" | "clock" | "maintenanceTaskRepository" | "productRepository" | "notifier"
  >,
): Promise<SendWeeklyDigestResult> {
  const userId = await deps.auth.requireUserId();
  const [tasks, products] = await Promise.all([
    deps.maintenanceTaskRepository.listByUser(userId),
    deps.productRepository.listByUser(userId),
  ]);
  const productNames = new Map(products.map((p) => [p.id, p.name] as const));

  const message = buildWeeklyDigest({
    items: tasks.flatMap((task) =>
      task.nextDueDate === null
        ? []
        : [
            {
              productName: productNames.get(task.productId) ?? null,
              title: task.title,
              dueDate: task.nextDueDate,
            },
          ],
    ),
    now: deps.clock.now(),
  });
  if (message === null) return { sent: false };

  await deps.notifier.send(message);
  return { sent: true };
}
