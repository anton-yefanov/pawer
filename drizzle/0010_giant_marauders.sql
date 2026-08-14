CREATE TABLE `template_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`template_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`duration_seconds` integer,
	`distance_m` real,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`template_exercise_id`) REFERENCES `template_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `template_sets_template_exercise_idx` ON `template_sets` (`template_exercise_id`,`position`);--> statement-breakpoint
ALTER TABLE `template_exercises` ADD `notes` text;