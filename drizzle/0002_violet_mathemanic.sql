CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
ALTER TABLE `templates` ADD `folder_id` text REFERENCES folders(id);--> statement-breakpoint
CREATE INDEX `templates_folder_idx` ON `templates` (`folder_id`);