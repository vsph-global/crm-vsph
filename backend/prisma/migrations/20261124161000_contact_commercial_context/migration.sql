-- Nullable fields; no inferred relationship or commercial amounts.
ALTER TABLE `contacts` ADD COLUMN `contact_relationship_stage` ENUM('NEW','CONTACTED','QUALIFIED','DISQUALIFIED','CUSTOMER') NULL;
ALTER TABLE `opportunities`
  ADD COLUMN `opportunity_value` DECIMAL(18,2) NULL,
  ADD COLUMN `opportunity_currency` VARCHAR(3) NULL,
  ADD COLUMN `opportunity_next_step` VARCHAR(191) NULL;
