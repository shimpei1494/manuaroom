import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";
import type { Deps } from "../deps";

/** 記録した日が from 以上 to 未満の実施・スキップの記録 (カレンダー用)。 */
export async function listMaintenanceLogsInPeriod(
  deps: Pick<Deps, "auth" | "maintenanceLogRepository">,
  input: { from: Date; to: Date },
): Promise<MaintenanceLog[]> {
  const userId = await deps.auth.requireUserId();
  return deps.maintenanceLogRepository.listByPeriod({ userId, ...input });
}
