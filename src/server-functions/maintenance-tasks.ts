import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createMaintenanceTask } from "../application/usecases/create-maintenance-task";
import { deleteMaintenanceTask } from "../application/usecases/delete-maintenance-task";
import { listMaintenanceTasks } from "../application/usecases/list-maintenance-tasks";
import { markMaintenanceDone } from "../application/usecases/mark-maintenance-done";
import { updateMaintenanceTask } from "../application/usecases/update-maintenance-task";
import { INTERVAL_UNIT_VALUES } from "../domain/maintenance/maintenance-task";
import { getDeps } from "../infrastructure/deps";

const ListMaintenanceTasksInputSchema = z.object({
  productId: z.string().min(1).optional(),
});

const CreateMaintenanceTaskInputSchema = z.object({
  productId: z.string().min(1),
  title: z.string().min(1, "タスク名は必須です"),
  intervalValue: z.number().int().positive().nullish(),
  intervalUnit: z.enum(INTERVAL_UNIT_VALUES).nullish(),
  memo: z.string().nullish(),
  url: z
    .url()
    .nullish()
    .or(z.literal("").transform(() => null)),
  initialDueDate: z.coerce.date().nullish(),
});

const MarkMaintenanceDoneInputSchema = z.object({
  taskId: z.string().min(1),
  doneAt: z.coerce.date().optional(),
  memo: z.string().nullish(),
});

const UpdateMaintenanceTaskInputSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1, "タスク名は必須です"),
  intervalValue: z.number().int().positive().nullable(),
  intervalUnit: z.enum(INTERVAL_UNIT_VALUES).nullable(),
  memo: z.string().nullable(),
  url: z
    .url()
    .nullable()
    .or(z.literal("").transform(() => null)),
  nextDueDate: z.coerce.date().nullish(),
});

const TaskIdSchema = z.object({ taskId: z.string().min(1) });

export const listMaintenanceTasksFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => ListMaintenanceTasksInputSchema.parse(data))
  .handler(async ({ data }) => {
    return listMaintenanceTasks(getDeps(), data);
  });

export const createMaintenanceTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => CreateMaintenanceTaskInputSchema.parse(data))
  .handler(async ({ data }) => {
    return createMaintenanceTask(getDeps(), data);
  });

export const markMaintenanceDoneFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => MarkMaintenanceDoneInputSchema.parse(data))
  .handler(async ({ data }) => {
    return markMaintenanceDone(getDeps(), data);
  });

export const updateMaintenanceTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UpdateMaintenanceTaskInputSchema.parse(data))
  .handler(async ({ data }) => {
    return updateMaintenanceTask(getDeps(), data);
  });

export const deleteMaintenanceTaskFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TaskIdSchema.parse(data))
  .handler(async ({ data }) => {
    await deleteMaintenanceTask(getDeps(), data.taskId);
  });
