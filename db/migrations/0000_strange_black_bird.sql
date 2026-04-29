CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`install_id` text NOT NULL,
	`org_id` text NOT NULL,
	`command` text NOT NULL,
	`subcommand` text,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`duration_ms` real,
	`outcome` text,
	`feature_name` text,
	`round_count` integer,
	`prompt_text` text,
	`session_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_org_id_idx` ON `events` (`org_id`);--> statement-breakpoint
CREATE INDEX `events_org_id_created_at_idx` ON `events` (`org_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_install_id_idx` ON `events` (`install_id`);--> statement-breakpoint
CREATE TABLE `installs` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`computer_name` text NOT NULL,
	`git_user_id` text NOT NULL,
	`hmac` text NOT NULL,
	`api_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `installs_api_key_unique` ON `installs` (`api_key`);--> statement-breakpoint
CREATE INDEX `installs_org_id_idx` ON `installs` (`org_id`);--> statement-breakpoint
CREATE TABLE `orgs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'developer' NOT NULL,
	`org_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_active_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);