import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import {
  AI_SUGGESTION_STATUS_VALUES,
  AI_SUGGESTION_TYPE_VALUES,
} from "../../domain/ai-suggestion/ai-suggestion";
import { MAINTENANCE_LOG_KIND_VALUES } from "../../domain/maintenance/maintenance-log";
import {
  INTERVAL_UNIT_VALUES,
  MAINTENANCE_TASK_SOURCE_VALUES,
} from "../../domain/maintenance/maintenance-task";
import { AI_STATUS_VALUES } from "../../domain/manual/manual";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date());

export const products = sqliteTable("products", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  modelNumber: text("model_number"),
  category: text("category"),
  location: text("location"),
  purchaseDate: integer("purchase_date", { mode: "timestamp_ms" }),
  warrantyUntil: integer("warranty_until", { mode: "timestamp_ms" }),
  memo: text("memo"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const manuals = sqliteTable("manuals", {
  id: id(),
  userId: text("user_id").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  pageCount: integer("page_count"),
  aiStatus: text("ai_status", { enum: AI_STATUS_VALUES }).notNull().default("not_analyzed"),
  createdAt: createdAt(),
});

export const maintenanceTasks = sqliteTable("maintenance_tasks", {
  id: id(),
  userId: text("user_id").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  intervalValue: integer("interval_value"),
  intervalUnit: text("interval_unit", { enum: INTERVAL_UNIT_VALUES }),
  nextDueDate: integer("next_due_date", { mode: "timestamp_ms" }),
  lastDoneAt: integer("last_done_at", { mode: "timestamp_ms" }),
  memo: text("memo"),
  url: text("url"),
  source: text("source", { enum: MAINTENANCE_TASK_SOURCE_VALUES }),
  sourceManualId: text("source_manual_id").references(() => manuals.id, {
    onDelete: "set null",
  }),
  sourcePage: integer("source_page"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: id(),
  userId: text("user_id").notNull(),
  taskId: text("task_id")
    .notNull()
    .references(() => maintenanceTasks.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: MAINTENANCE_LOG_KIND_VALUES }).notNull().default("done"),
  // 記録した日 (実施日またはスキップした日)
  doneAt: integer("done_at", { mode: "timestamp_ms" }).notNull(),
  memo: text("memo"),
  createdAt: createdAt(),
});

export const aiSuggestions = sqliteTable("ai_suggestions", {
  id: id(),
  userId: text("user_id").notNull(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  manualId: text("manual_id")
    .notNull()
    .references(() => manuals.id, { onDelete: "cascade" }),
  type: text("type", { enum: AI_SUGGESTION_TYPE_VALUES }).notNull(),
  payloadJson: text("payload_json").notNull(),
  status: text("status", { enum: AI_SUGGESTION_STATUS_VALUES }).notNull().default("pending"),
  createdAt: createdAt(),
});
