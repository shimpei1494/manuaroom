import { and, desc, eq } from "drizzle-orm";

import type { MaintenanceLogRepositoryPort } from "../../../application/ports/maintenance-log-repository-port";
import type { Db } from "../client";
import { maintenanceLogs } from "../schema";

export function createMaintenanceLogRepository(db: Db): MaintenanceLogRepositoryPort {
  return {
    async create(log) {
      await db.insert(maintenanceLogs).values(log);
    },
    async listByTask({ userId, taskId }) {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.taskId, taskId)))
        .orderBy(desc(maintenanceLogs.doneAt));
      return rows;
    },
    async listByKind({ userId, kind }) {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.kind, kind)));
      return rows;
    },
  };
}
