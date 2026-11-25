ALTER TABLE `contact_activity_entries` ADD COLUMN `entry_deleted_at` DATETIME(3) NULL, ADD COLUMN `entry_revision` INTEGER NOT NULL DEFAULT 0, ADD COLUMN `entry_audit` JSON NULL;
