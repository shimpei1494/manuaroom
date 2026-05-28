import type { MaintenanceLog } from "../../domain/maintenance/maintenance-log";

export type MaintenanceLogRepositoryPort = {
  create(log: MaintenanceLog): Promise<void>;
  listByTask(input: { userId: string; taskId: string }): Promise<MaintenanceLog[]>;
};
