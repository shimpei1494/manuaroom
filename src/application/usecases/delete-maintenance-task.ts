import type { Deps } from "../deps";

export async function deleteMaintenanceTask(
  deps: Pick<Deps, "auth" | "maintenanceTaskRepository">,
  taskId: string,
): Promise<void> {
  const userId = await deps.auth.requireUserId();
  await deps.maintenanceTaskRepository.delete({ userId, taskId });
}
