ALTER TABLE `exercises` ADD `tracking_type` text DEFAULT 'weight_reps' NOT NULL;--> statement-breakpoint
ALTER TABLE `sets` ADD `duration_seconds` integer;--> statement-breakpoint
ALTER TABLE `sets` ADD `distance_m` real;