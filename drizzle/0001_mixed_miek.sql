ALTER TABLE `templates` ADD `source_id` text;--> statement-breakpoint
ALTER TABLE `templates` ADD `is_built_in` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `templates_source_id_unq` ON `templates` (`source_id`);