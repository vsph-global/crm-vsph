-- Additive: historical call outcomes remain unknown; manually logged entries are distinct from calls.
ALTER TABLE `calls` ADD COLUMN `call_outcome` ENUM('RINGING','PITCH_DONE','NOT_INTERESTED','NOT_RELEVANT','LEFT_ORGANIZATION','NOT_AVAILABLE','CONNECTED','NOT_CONNECTED','WRONG_NUMBER','DNC') NULL;

CREATE TABLE `contact_activity_entries` (
  `entry_id` VARCHAR(191) NOT NULL,
  `tenant_fk` VARCHAR(191) NOT NULL,
  `contact_fk` VARCHAR(191) NOT NULL,
  `user_fk` VARCHAR(191) NULL,
  `entry_kind` ENUM('NOTE','EMAIL','MEETING','LINKEDIN') NOT NULL,
  `entry_subject` VARCHAR(191) NOT NULL,
  `entry_description` TEXT NOT NULL,
  `entry_occurred_at` DATETIME(3) NOT NULL,
  `entry_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`entry_id`),
  INDEX `contact_entries_tenant_contact_occurred_idx` (`tenant_fk`, `contact_fk`, `entry_occurred_at`),
  INDEX `contact_activity_entries_contact_fk_idx` (`contact_fk`),
  INDEX `contact_activity_entries_user_fk_idx` (`user_fk`),
  CONSTRAINT `contact_activity_entries_tenant_fk_fkey` FOREIGN KEY (`tenant_fk`) REFERENCES `tenants`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `contact_activity_entries_contact_fk_fkey` FOREIGN KEY (`contact_fk`) REFERENCES `contacts`(`contact_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `contact_activity_entries_user_fk_fkey` FOREIGN KEY (`user_fk`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
