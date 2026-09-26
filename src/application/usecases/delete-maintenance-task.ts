import type { Deps } from "../../infrastructure/deps";

export async function deleteMaintenanceTask(deps: Deps, taskId: string): Promise<void> {
  const userId = await deps.auth.requireUserId();
  await deps.maintenanceTaskRepository.delete({ userId, taskId });
}
