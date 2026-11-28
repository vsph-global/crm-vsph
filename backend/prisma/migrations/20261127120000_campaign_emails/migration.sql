-- Campaign email sends and per-recipient results.
-- Additive only: no existing table or column is modified.
CREATE TABLE IF NOT EXISTS `campaign_emails` (
  `campaign_email_id` VARCHAR(191) NOT NULL,
  `tenant_fk` VARCHAR(191) NOT NULL,
  `sender_user_fk` VARCHAR(191) NULL,
  `template_fk` VARCHAR(191) NULL,
  `template_name` VARCHAR(191) NULL,
  `sender_email` VARCHAR(191) NOT NULL,
  `subject` TEXT NOT NULL,
  `body_html` TEXT NOT NULL,
  `body_text` TEXT NULL,
  `status` ENUM('SENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'SENDING',
  `recipient_count` INTEGER NOT NULL DEFAULT 0,
  `sent_count` INTEGER NOT NULL DEFAULT 0,
  `failed_count` INTEGER NOT NULL DEFAULT 0,
  `error` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sent_at` DATETIME(3) NULL,
  INDEX `campaign_emails_tenant_fk_idx`(`tenant_fk`),
  INDEX `campaign_emails_created_at_idx`(`created_at`),
  PRIMARY KEY (`campaign_email_id`),
  CONSTRAINT `campaign_emails_tenant_fk_fkey` FOREIGN KEY (`tenant_fk`) REFERENCES `tenants`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `campaign_emails_sender_user_fk_fkey` FOREIGN KEY (`sender_user_fk`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `campaign_emails_template_fk_fkey` FOREIGN KEY (`template_fk`) REFERENCES `email_templates`(`email_template_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `campaign_email_recipients` (
  `recipient_id` VARCHAR(191) NOT NULL,
  `campaign_email_fk` VARCHAR(191) NOT NULL,
  `contact_fk` VARCHAR(191) NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `error` TEXT NULL,
  `sent_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `campaign_email_recipients_campaign_email_fk_idx`(`campaign_email_fk`),
  PRIMARY KEY (`recipient_id`),
  CONSTRAINT `campaign_email_recipients_campaign_email_fk_fkey` FOREIGN KEY (`campaign_email_fk`) REFERENCES `campaign_emails`(`campaign_email_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `campaign_email_recipients_contact_fk_fkey` FOREIGN KEY (`contact_fk`) REFERENCES `contacts`(`contact_id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
