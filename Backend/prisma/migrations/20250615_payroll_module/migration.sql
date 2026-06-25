-- Payroll Module Migration
-- Run via: npx prisma db push (or prisma migrate deploy)

ALTER TABLE `employee` ADD COLUMN `base_salary` DECIMAL(12,2) DEFAULT 0;

CREATE TABLE `payrollperiod` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `pay_date` DATETIME NOT NULL,
  `status` ENUM('draft','generated','approved','paid') NOT NULL DEFAULT 'draft',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_payrollperiod_company` (`company_id`),
  INDEX `idx_payrollperiod_pay_date` (`pay_date`),
  INDEX `idx_payrollperiod_status` (`status`),
  CONSTRAINT `payrollperiod_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE
);

CREATE TABLE `payroll` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `company_id` INT NOT NULL,
  `payroll_period_id` INT NOT NULL,
  `employee_id` INT NOT NULL,
  `base_salary` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `allowance` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `overtime` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `bonus` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `deduction` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `tax` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `gross_salary` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `net_salary` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` ENUM('draft','generated','approved','paid') NOT NULL DEFAULT 'draft',
  `payslip_path` VARCHAR(500) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_payroll_period_employee` (`payroll_period_id`, `employee_id`),
  INDEX `idx_payroll_company_period` (`company_id`, `payroll_period_id`),
  INDEX `idx_payroll_employee` (`employee_id`),
  INDEX `idx_payroll_status` (`status`),
  CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_ibfk_2` FOREIGN KEY (`payroll_period_id`) REFERENCES `payrollperiod`(`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employee`(`id`) ON DELETE CASCADE
);

CREATE TABLE `payrollitem` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payroll_id` INT NOT NULL,
  `type` ENUM('base_salary','allowance','overtime','bonus','deduction','tax') NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_payrollitem_payroll` (`payroll_id`),
  INDEX `idx_payrollitem_type` (`type`),
  CONSTRAINT `payrollitem_ibfk_1` FOREIGN KEY (`payroll_id`) REFERENCES `payroll`(`id`) ON DELETE CASCADE
);

CREATE TABLE `payrolladjustment` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payroll_id` INT NOT NULL,
  `field` VARCHAR(100) NOT NULL,
  `old_value` DECIMAL(12,2) NULL,
  `new_value` DECIMAL(12,2) NULL,
  `reason` TEXT NULL,
  `adjusted_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_payrolladjustment_payroll` (`payroll_id`),
  INDEX `idx_payrolladjustment_user` (`adjusted_by`),
  CONSTRAINT `payrolladjustment_ibfk_1` FOREIGN KEY (`payroll_id`) REFERENCES `payroll`(`id`) ON DELETE CASCADE,
  CONSTRAINT `payrolladjustment_ibfk_2` FOREIGN KEY (`adjusted_by`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
