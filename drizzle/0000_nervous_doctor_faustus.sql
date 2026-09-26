CREATE TABLE `ai_suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`manual_id` text NOT NULL,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manual_id`) REFERENCES `manuals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`task_id` text NOT NULL,
	`done_at` integer NOT NULL,
	`memo` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `maintenance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`title` text NOT NULL,
	`interval_value` integer,
	`interval_unit` text,
	`next_due_date` integer,
	`last_done_at` integer,
	`memo` text,
	`url` text,
	`source` text,
	`source_manual_id` text,
	`source_page` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_manual_id`) REFERENCES `manuals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `manuals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`page_count` integer,
	`ai_status` text DEFAULT 'not_analyzed' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text,
	`model_number` text,
	`category` text,
	`location` text,
	`purchase_date` integer,
	`warranty_until` integer,
	`memo` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
