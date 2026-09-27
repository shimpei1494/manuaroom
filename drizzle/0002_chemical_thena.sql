ALTER TABLE `maintenance_logs` ADD `has_previous_task_state` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD `previous_next_due_date` integer;--> statement-breakpoint
ALTER TABLE `maintenance_logs` ADD `previous_last_done_at` integer;