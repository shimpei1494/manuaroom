export const INTERVAL_UNIT_VALUES = ["day", "week", "month", "year"] as const;
export type IntervalUnit = (typeof INTERVAL_UNIT_VALUES)[number];

export const MAINTENANCE_TASK_SOURCE_VALUES = ["manual", "ai"] as const;
export type MaintenanceTaskSource = (typeof MAINTENANCE_TASK_SOURCE_VALUES)[number];

export type MaintenanceTask = {
  id: string;
  userId: string;
  productId: string;
  title: string;
  intervalValue: number | null;
  intervalUnit: IntervalUnit | null;
  nextDueDate: Date | null;
  lastDoneAt: Date | null;
  memo: string | null;
  url: string | null;
  source: MaintenanceTaskSource | null;
  sourceManualId: string | null;
  sourcePage: number | null;
  createdAt: Date;
  updatedAt: Date;
};
