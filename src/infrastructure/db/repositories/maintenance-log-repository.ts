import { and, desc, eq, gte, lt } from "drizzle-orm";

import type { MaintenanceLogRepositoryPort } from "../../../application/ports/maintenance-log-repository-port";
import type { MaintenanceLog } from "../../../domain/maintenance/maintenance-log";
import type { Db } from "../client";
import { maintenanceLogs } from "../schema";

type Row = typeof maintenanceLogs.$inferSelect;

function toDomain({
  hasPreviousTaskState,
  previousNextDueDate,
  previousLastDoneAt,
  ...rest
}: Row): MaintenanceLog {
  return {
    ...rest,
    previousTaskState: hasPreviousTaskState
      ? { nextDueDate: previousNextDueDate, lastDoneAt: previousLastDoneAt }
      : null,
  };
}

function toRow({ previousTaskState, ...rest }: MaintenanceLog): Row {
  return {
    ...rest,
    hasPreviousTaskState: previousTaskState !== null,
    previousNextDueDate: previousTaskState?.nextDueDate ?? null,
    previousLastDoneAt: previousTaskState?.lastDoneAt ?? null,
  };
}

export function createMaintenanceLogRepository(db: Db): MaintenanceLogRepositoryPort {
  return {
    async create(log) {
      await db.insert(maintenanceLogs).values(toRow(log));
    },
    async findById({ userId, logId }) {
      const [row] = await db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.id, logId)));
      return row ? toDomain(row) : null;
    },
    async listByTask({ userId, taskId }) {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.taskId, taskId)))
        .orderBy(desc(maintenanceLogs.doneAt), desc(maintenanceLogs.createdAt));
      return rows.map(toDomain);
    },
    async listByKind({ userId, kind }) {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.kind, kind)));
      return rows.map(toDomain);
    },
    async listByPeriod({ userId, from, to }) {
      const rows = await db
        .select()
        .from(maintenanceLogs)
        .where(
          and(
            eq(maintenanceLogs.userId, userId),
            gte(maintenanceLogs.doneAt, from),
            lt(maintenanceLogs.doneAt, to),
          ),
        );
      return rows.map(toDomain);
    },
    async delete({ userId, logId }) {
      await db
        .delete(maintenanceLogs)
        .where(and(eq(maintenanceLogs.userId, userId), eq(maintenanceLogs.id, logId)));
    },
  };
}
