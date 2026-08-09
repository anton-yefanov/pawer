DROP TABLE `personal_records`;--> statement-breakpoint
CREATE TABLE `personal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`exercise_id` text NOT NULL,
	`workout_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real NOT NULL,
	`set_id` text,
	`achieved_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`set_id`) REFERENCES `sets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `personal_records_exercise_kind_idx` ON `personal_records` (`exercise_id`,`kind`,`value`);--> statement-breakpoint
CREATE INDEX `personal_records_workout_idx` ON `personal_records` (`workout_id`);
