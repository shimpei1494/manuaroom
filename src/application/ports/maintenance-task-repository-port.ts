import type { MaintenanceTask } from "../../domain/maintenance/maintenance-task";

export type MaintenanceTaskRepositoryPort = {
  create(task: MaintenanceTask): Promise<void>;
  findById(input: { userId: string; taskId: string }): Promise<MaintenanceTask | null>;
  listByUser(userId: string): Promise<MaintenanceTask[]>;
  listByProduct(input: { userId: string; productId: string }): Promise<MaintenanceTask[]>;
  update(task: MaintenanceTask): Promise<void>;
  delete(input: { userId: string; taskId: string }): Promise<void>;
};
