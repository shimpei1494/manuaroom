import { and, eq } from "drizzle-orm";

import type { MaintenanceTaskRepositoryPort } from "../../../application/ports/maintenance-task-repository-port";
import type { Db } from "../client";
import { maintenanceTasks } from "../schema";

export function createMaintenanceTaskRepository(db: Db): MaintenanceTaskRepositoryPort {
  return {
    async create(task) {
      await db.insert(maintenanceTasks).values(task);
    },
    async findById({ userId, taskId }) {
      const rows = await db
        .select()
        .from(maintenanceTasks)
        .where(and(eq(maintenanceTasks.userId, userId), eq(maintenanceTasks.id, taskId)))
        .limit(1);
      return rows[0] ?? null;
    },
    async listByUser(userId) {
      const rows = await db
        .select()
        .from(maintenanceTasks)
        .where(eq(maintenanceTasks.userId, userId))
        .orderBy(maintenanceTasks.nextDueDate);
      return rows;
    },
    async listByProduct({ userId, productId }) {
      const rows = await db
        .select()
        .from(maintenanceTasks)
        .where(and(eq(maintenanceTasks.userId, userId), eq(maintenanceTasks.productId, productId)))
        .orderBy(maintenanceTasks.nextDueDate);
      return rows;
    },
    async update(task) {
      await db
        .update(maintenanceTasks)
        .set({
          title: task.title,
          intervalValue: task.intervalValue,
          intervalUnit: task.intervalUnit,
          nextDueDate: task.nextDueDate,
          lastDoneAt: task.lastDoneAt,
          memo: task.memo,
          url: task.url,
          source: task.source,
          sourceManualId: task.sourceManualId,
          sourcePage: task.sourcePage,
          updatedAt: task.updatedAt,
        })
        .where(and(eq(maintenanceTasks.userId, task.userId), eq(maintenanceTasks.id, task.id)));
    },
    async delete({ userId, taskId }) {
      await db
        .delete(maintenanceTasks)
        .where(and(eq(maintenanceTasks.userId, userId), eq(maintenanceTasks.id, taskId)));
    },
  };
}
