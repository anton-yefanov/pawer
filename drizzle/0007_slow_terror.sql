ALTER TABLE `exercises` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercises` ADD `search_text` text DEFAULT '' NOT NULL;