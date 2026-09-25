ALTER TABLE `folders` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `folders` ADD `is_built_in` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `folders_source_id_unq` ON `folders` (`source_id`);