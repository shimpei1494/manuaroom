import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";
import type { Deps } from "../deps";

export type ListMaintenanceTasksInput = {
  productId?: string;
};

export async function listMaintenanceTasks(
  deps: Pick<Deps, "auth" | "maintenanceTaskRepository">,
  input: ListMaintenanceTasksInput = {},
): Promise<MaintenanceTask[]> {
  const userId = await deps.auth.requireUserId();
  if (input.productId !== undefined) {
    return deps.maintenanceTaskRepository.listByProduct({ userId, productId: input.productId });
  }
  return deps.maintenanceTaskRepository.listByUser(userId);
}
