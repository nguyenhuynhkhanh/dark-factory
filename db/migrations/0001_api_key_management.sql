DROP TABLE IF EXISTS `installs_new`;
--> statement-breakpoint
CREATE TABLE `installs_new` (
    `id` text PRIMARY KEY NOT NULL,
    `org_id` text NOT NULL,
    `label` text NOT NULL DEFAULT '',
    `computer_name` text,
    `git_user_id` text,
    `api_key` text NOT NULL,
    `expires_at` integer NOT NULL,
    `revoked_at` integer,
    `created_at` integer NOT NULL,
    `last_seen_at` integer
);
--> statement-breakpoint
INSERT INTO `installs_new`
    SELECT
        id,
        org_id,
        'legacy-' || substr(id, 1, 8) AS label,
        computer_name,
        git_user_id,
        api_key,
        (created_at + 2592000) AS expires_at,
        NULL AS revoked_at,
        created_at,
        last_seen_at
    FROM `installs`;
--> statement-breakpoint
DROP TABLE `installs`;
--> statement-breakpoint
ALTER TABLE `installs_new` RENAME TO `installs`;
--> statement-breakpoint
CREATE UNIQUE INDEX `installs_api_key_unique` ON `installs` (`api_key`);
--> statement-breakpoint
CREATE INDEX `installs_org_id_idx` ON `installs` (`org_id`);
