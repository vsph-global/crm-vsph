-- Upstream email templates were introduced without a migration.
-- Existing installations may already have this table from a schema push.
-- Verify exact table parity on staging before deploying.
CREATE TABLE IF NOT EXISTS `email_templates` (
  `email_template_id` VARCHAR(191) NOT NULL,
  `tenant_fk` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `subject` TEXT NOT NULL,
  `body_html` TEXT NOT NULL,
  `body_text` TEXT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `email_templates_tenant_fk_idx`(`tenant_fk`),
  PRIMARY KEY (`email_template_id`),
  CONSTRAINT `email_templates_tenant_fk_fkey` FOREIGN KEY (`tenant_fk`) REFERENCES `tenants`(`tenant_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
