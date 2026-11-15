CREATE TABLE `product_placements` (
	`product_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
