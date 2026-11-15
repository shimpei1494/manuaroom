CREATE TABLE `home_layouts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`layout_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
