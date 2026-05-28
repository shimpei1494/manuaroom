import { calculateNextDueDate } from "../../domain/maintenance/calculate-next-due-date";
import type { IntervalUnit, MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../../infrastructure/deps";

export type CreateMaintenanceTaskInput = {
  productId: string;
  title: string;
  intervalValue?: number | null;
  intervalUnit?: IntervalUnit | null;
  memo?: string | null;
  url?: string | null;
  /** 初回の予定日。未指定で interval が両方ある場合は「今日 + interval」で計算。 */
  initialDueDate?: Date | null;
};

export async function createMaintenanceTask(
  deps: Deps,
  input: CreateMaintenanceTaskInput,
): Promise<MaintenanceTask> {
  const userId = await deps.auth.requireUserId();

  const product = await deps.productRepository.findById({ userId, productId: input.productId });
  if (!product) {
    throw new Error(`Product not found: ${input.productId}`);
  }

  const now = new Date();
  const intervalValue = input.intervalValue ?? null;
  const intervalUnit = input.intervalUnit ?? null;

  let nextDueDate: Date | null;
  if (input.initialDueDate !== undefined && input.initialDueDate !== null) {
    nextDueDate = input.initialDueDate;
  } else if (intervalValue !== null && intervalUnit !== null) {
    nextDueDate = calculateNextDueDate(now, intervalValue, intervalUnit);
  } else {
    nextDueDate = null;
  }

  const task: MaintenanceTask = {
    id: crypto.randomUUID(),
    userId,
    productId: input.productId,
    title: input.title,
    intervalValue,
    intervalUnit,
    nextDueDate,
    lastDoneAt: null,
    memo: input.memo ?? null,
    url: input.url ?? null,
    source: "manual",
    sourceManualId: null,
    sourcePage: null,
    createdAt: now,
    updatedAt: now,
  };

  await deps.maintenanceTaskRepository.create(task);
  return task;
}
