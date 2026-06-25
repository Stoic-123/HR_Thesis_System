-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               8.4.3 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for hrms
CREATE DATABASE IF NOT EXISTS `hrms` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `hrms`;

-- Dumping structure for table hrms.announcement
CREATE TABLE IF NOT EXISTS `announcement` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `announcement` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcement_company` (`company_id`),
  CONSTRAINT `announcement_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.asset
CREATE TABLE IF NOT EXISTS `asset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `category_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `serial_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `condition` enum('good','fair','damaged') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'good',
  `status` enum('available','pending_manager','pending_hr','assigned','under_repair','retired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'available',
  `assigned_to` int DEFAULT NULL,
  `assigned_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_company` (`company_id`),
  KEY `idx_asset_category` (`category_id`),
  KEY `idx_asset_employee` (`assigned_to`),
  CONSTRAINT `asset_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `employee` (`id`) ON DELETE SET NULL,
  CONSTRAINT `asset_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `assetcategory` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asset_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.assetcategory
CREATE TABLE IF NOT EXISTS `assetcategory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assetcategory_company` (`company_id`),
  CONSTRAINT `assetcategory_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.assethistory
CREATE TABLE IF NOT EXISTS `assethistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `asset_id` int NOT NULL,
  `company_id` int NOT NULL,
  `previous_assignee_id` int NOT NULL,
  `condition_out` enum('good','fair','damaged') COLLATE utf8mb4_unicode_ci NOT NULL,
  `condition_in` enum('good','fair','damaged') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assigned_date` datetime NOT NULL,
  `returned_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assethistory_asset` (`asset_id`),
  KEY `idx_assethistory_employee` (`previous_assignee_id`),
  KEY `assethistory_company_id_fkey` (`company_id`),
  CONSTRAINT `assethistory_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assethistory_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assethistory_previous_assignee_id_fkey` FOREIGN KEY (`previous_assignee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.assetrequest
CREATE TABLE IF NOT EXISTS `assetrequest` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `requested_by` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `asset_id` int DEFAULT NULL,
  `type` enum('assignment','return') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'assignment',
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('available','pending_manager','pending_hr','assigned','under_repair','retired') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_manager',
  `manager_id` int DEFAULT NULL,
  `manager_comment` text COLLATE utf8mb4_unicode_ci,
  `hr_comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_assetrequest_company` (`company_id`),
  KEY `idx_assetrequest_employee` (`requested_by`),
  KEY `assetrequest_manager_id_fkey` (`manager_id`),
  KEY `assetrequest_category_id_fkey` (`category_id`),
  KEY `assetrequest_asset_id_fkey` (`asset_id`),
  CONSTRAINT `assetrequest_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `asset` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assetrequest_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `assetcategory` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assetrequest_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assetrequest_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `employee` (`id`) ON DELETE SET NULL,
  CONSTRAINT `assetrequest_requested_by_fkey` FOREIGN KEY (`requested_by`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.attendancerecord
CREATE TABLE IF NOT EXISTS `attendancerecord` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `time_mode_id` int NOT NULL,
  `status` enum('present','absent','late','half_day') COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'FINGER',
  `work_at` datetime NOT NULL,
  `is_late` tinyint(1) DEFAULT '0',
  `is_early` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_employee` (`employee_id`),
  KEY `idx_attendance_status` (`status`),
  KEY `idx_attendance_timemode` (`time_mode_id`),
  KEY `idx_attendance_work_at` (`work_at`),
  CONSTRAINT `attendancerecord_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendancerecord_ibfk_2` FOREIGN KEY (`time_mode_id`) REFERENCES `timemode` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.auditlog
CREATE TABLE IF NOT EXISTS `auditlog` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `company_id` int NOT NULL,
  `module` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_company` (`company_id`),
  KEY `idx_audit_created` (`created_at`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_user` (`user_id`),
  CONSTRAINT `auditlog_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL,
  CONSTRAINT `auditlog_ibfk_2` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.company
CREATE TABLE IF NOT EXISTS `company` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_color` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_group_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_bot_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_company_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.dayofweek
CREATE TABLE IF NOT EXISTS `dayofweek` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `monday_id` int DEFAULT NULL,
  `tuesday_id` int DEFAULT NULL,
  `wednesday_id` int DEFAULT NULL,
  `thursday_id` int DEFAULT NULL,
  `friday_id` int DEFAULT NULL,
  `saturday_id` int DEFAULT NULL,
  `sunday_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_dayofweek_company` (`company_id`),
  KEY `dayofweek_monday_id_fkey` (`monday_id`),
  KEY `dayofweek_tuesday_id_fkey` (`tuesday_id`),
  KEY `dayofweek_wednesday_id_fkey` (`wednesday_id`),
  KEY `dayofweek_thursday_id_fkey` (`thursday_id`),
  KEY `dayofweek_friday_id_fkey` (`friday_id`),
  KEY `dayofweek_saturday_id_fkey` (`saturday_id`),
  KEY `dayofweek_sunday_id_fkey` (`sunday_id`),
  CONSTRAINT `dayofweek_friday_id_fkey` FOREIGN KEY (`friday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dayofweek_monday_id_fkey` FOREIGN KEY (`monday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_saturday_id_fkey` FOREIGN KEY (`saturday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_sunday_id_fkey` FOREIGN KEY (`sunday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_thursday_id_fkey` FOREIGN KEY (`thursday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_tuesday_id_fkey` FOREIGN KEY (`tuesday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL,
  CONSTRAINT `dayofweek_wednesday_id_fkey` FOREIGN KEY (`wednesday_id`) REFERENCES `timesheet` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.department
CREATE TABLE IF NOT EXISTS `department` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager_id` int DEFAULT NULL,
  `company_id` int NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_department_company` (`company_id`),
  KEY `idx_department_manager` (`manager_id`),
  CONSTRAINT `department_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_department_manager` FOREIGN KEY (`manager_id`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.document
CREATE TABLE IF NOT EXISTS `document` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `document_type_id` int NOT NULL,
  `document_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_document_employee` (`employee_id`),
  KEY `idx_document_type` (`document_type_id`),
  CONSTRAINT `document_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_ibfk_2` FOREIGN KEY (`document_type_id`) REFERENCES `documenttype` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.documenttype
CREATE TABLE IF NOT EXISTS `documenttype` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doctype_company` (`company_id`),
  CONSTRAINT `documenttype_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.employee
CREATE TABLE IF NOT EXISTS `employee` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `age` int DEFAULT NULL,
  `gender` enum('male','female','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `phone_number1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone_number2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profile_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `role_id` int DEFAULT NULL,
  `location_id` int DEFAULT NULL,
  `telegram_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_chat_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `joined_at` datetime DEFAULT NULL,
  `company_id` int NOT NULL,
  `is_active` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `relationship_status` enum('single','married','divorced','widowed','other') COLLATE utf8mb4_unicode_ci DEFAULT 'single',
  `partner_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `partner_age` int DEFAULT NULL,
  `partner_occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_children` int DEFAULT '0',
  `total_daughters` int DEFAULT '0',
  `total_sons` int DEFAULT '0',
  `female_sibling` int DEFAULT '0',
  `total_sibling` int DEFAULT '0',
  `father_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_age` int DEFAULT NULL,
  `father_occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `father_life_status` enum('alive','deceased') COLLATE utf8mb4_unicode_ci DEFAULT 'alive',
  `mother_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_age` int DEFAULT NULL,
  `mother_occupation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mother_life_status` enum('alive','deceased') COLLATE utf8mb4_unicode_ci DEFAULT 'alive',
  `guardian_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guardian_phone_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guardian_relationship` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `base_salary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_employee_active` (`is_active`),
  KEY `idx_employee_company` (`company_id`),
  KEY `idx_employee_department` (`department_id`),
  KEY `idx_employee_location` (`location_id`),
  KEY `idx_employee_name` (`first_name`,`last_name`),
  KEY `idx_employee_position` (`position_id`),
  KEY `idx_employee_relationship` (`relationship_status`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `employee_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employee_ibfk_2` FOREIGN KEY (`position_id`) REFERENCES `positions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_ibfk_3` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_ibfk_4` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE SET NULL,
  CONSTRAINT `employee_ibfk_5` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.employeekpi
CREATE TABLE IF NOT EXISTS `employeekpi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `cycle_id` int NOT NULL,
  `total_score` double DEFAULT NULL,
  `rating` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `evaluation_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending_manager',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_cycle` (`employee_id`,`cycle_id`),
  KEY `idx_employeekpi_employee` (`employee_id`),
  KEY `idx_employeekpi_cycle` (`cycle_id`),
  CONSTRAINT `employeekpi_cycle_id_fkey` FOREIGN KEY (`cycle_id`) REFERENCES `kpicycle` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employeekpi_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.employeelocation
CREATE TABLE IF NOT EXISTS `employeelocation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `location_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_location` (`employee_id`,`location_id`),
  KEY `idx_employeelocation_employee` (`employee_id`),
  KEY `idx_employeelocation_location` (`location_id`),
  CONSTRAINT `employeelocation_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employeelocation_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `location` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.employeeworkingprofile
CREATE TABLE IF NOT EXISTS `employeeworkingprofile` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `day_of_week_id` int NOT NULL,
  `allow_online_bypass_location` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_working_profile` (`employee_id`),
  KEY `idx_employeeworkingprofile_employee` (`employee_id`),
  KEY `idx_employeeworkingprofile_dayofweek` (`day_of_week_id`),
  CONSTRAINT `employeeworkingprofile_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `employeeworkingprofile_ibfk_2` FOREIGN KEY (`day_of_week_id`) REFERENCES `dayofweek` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.holiday
CREATE TABLE IF NOT EXISTS `holiday` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `company_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_holiday_company` (`company_id`),
  KEY `idx_holiday_dates` (`start_date`,`end_date`),
  CONSTRAINT `holiday_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpicycle
CREATE TABLE IF NOT EXISTS `kpicycle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpicycle_company` (`company_id`),
  CONSTRAINT `kpicycle_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpigoal
CREATE TABLE IF NOT EXISTS `kpigoal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_kpi_id` int NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` double NOT NULL,
  `target_unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `weight` double NOT NULL,
  `current_progress` double NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `hr_score` double NOT NULL DEFAULT '0',
  `manager_score` double NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_kpigoal_employeekpi` (`employee_kpi_id`),
  CONSTRAINT `kpigoal_employee_kpi_id_fkey` FOREIGN KEY (`employee_kpi_id`) REFERENCES `employeekpi` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpigoalprogress
CREATE TABLE IF NOT EXISTS `kpigoalprogress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_id` int NOT NULL,
  `kpi_goal_id` int NOT NULL,
  `progress_percentage` double NOT NULL,
  `manager_comment` text COLLATE utf8mb4_unicode_ci,
  `employee_comment` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_review_goal` (`review_id`,`kpi_goal_id`),
  KEY `idx_kpigoalprogress_review` (`review_id`),
  KEY `idx_kpigoalprogress_goal` (`kpi_goal_id`),
  CONSTRAINT `kpigoalprogress_kpi_goal_id_fkey` FOREIGN KEY (`kpi_goal_id`) REFERENCES `kpigoal` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kpigoalprogress_review_id_fkey` FOREIGN KEY (`review_id`) REFERENCES `kpireview` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpireview
CREATE TABLE IF NOT EXISTS `kpireview` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_kpi_id` int NOT NULL,
  `reviewer_id` int NOT NULL,
  `quarter` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `overall_manager_comment` text COLLATE utf8mb4_unicode_ci,
  `overall_employee_comment` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `review_date` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_kpi_quarter` (`employee_kpi_id`,`quarter`),
  KEY `idx_kpireview_employeekpi` (`employee_kpi_id`),
  KEY `idx_kpireview_reviewer` (`reviewer_id`),
  CONSTRAINT `kpireview_employee_kpi_id_fkey` FOREIGN KEY (`employee_kpi_id`) REFERENCES `employeekpi` (`id`) ON DELETE CASCADE,
  CONSTRAINT `kpireview_reviewer_id_fkey` FOREIGN KEY (`reviewer_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpitemplate
CREATE TABLE IF NOT EXISTS `kpitemplate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpitemplate_company` (`company_id`),
  CONSTRAINT `kpitemplate_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.kpitemplategoal
CREATE TABLE IF NOT EXISTS `kpitemplategoal` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_value` double NOT NULL,
  `target_unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `weight` double NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kpitemplategoal_template` (`template_id`),
  CONSTRAINT `kpitemplategoal_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `kpitemplate` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.leaveprofile
CREATE TABLE IF NOT EXISTS `leaveprofile` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_type_id` int NOT NULL,
  `assignment` int DEFAULT '0',
  `used` int DEFAULT '0',
  `balance` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_employee_leavetype` (`employee_id`,`leave_type_id`),
  KEY `idx_leaveprofile_employee` (`employee_id`),
  KEY `idx_leaveprofile_leavetype` (`leave_type_id`),
  CONSTRAINT `leaveprofile_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leaveprofile_ibfk_2` FOREIGN KEY (`leave_type_id`) REFERENCES `leavetype` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.leaverecord
CREATE TABLE IF NOT EXISTS `leaverecord` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `leave_type_id` int NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `request_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `photo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_message_id` int DEFAULT NULL,
  `manager_telegram_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telegram_chat_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_leaverecord_dates` (`start_date`,`end_date`),
  KEY `idx_leaverecord_employee` (`employee_id`),
  KEY `idx_leaverecord_status` (`status`),
  KEY `leave_type_id` (`leave_type_id`),
  CONSTRAINT `leaverecord_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leaverecord_ibfk_2` FOREIGN KEY (`leave_type_id`) REFERENCES `leavetype` (`id`) ON DELETE CASCADE,
  CONSTRAINT `leaverecord_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.leavetype
CREATE TABLE IF NOT EXISTS `leavetype` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_balance` int NOT NULL DEFAULT '0',
  `company_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_leavetype_company` (`company_id`),
  CONSTRAINT `leavetype_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.location
CREATE TABLE IF NOT EXISTS `location` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int NOT NULL,
  `longitude` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `radius` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_location_company` (`company_id`),
  CONSTRAINT `location_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.notification
CREATE TABLE IF NOT EXISTS `notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `to_user_id` int DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notification_company` (`company_id`),
  KEY `idx_notification_user` (`to_user_id`),
  CONSTRAINT `notification_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_ibfk_2` FOREIGN KEY (`to_user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.onlineattendance
CREATE TABLE IF NOT EXISTS `onlineattendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `latitude` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `longitude` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `has_activity` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_onlineattendance_employee` (`employee_id`),
  KEY `idx_onlineattendance_created` (`created_at`),
  CONSTRAINT `onlineattendance_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.onlineattendancepending
CREATE TABLE IF NOT EXISTS `onlineattendancepending` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `online_id` int NOT NULL,
  `time_mode_id` int DEFAULT NULL,
  `photo_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` text COLLATE utf8mb4_unicode_ci,
  `latitude` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `longitude` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `has_activity` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `telegram_message_id` int DEFAULT NULL,
  `manager_telegram_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `computed_meta` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pending_status` (`status`),
  KEY `idx_pending_company` (`company_id`),
  KEY `idx_pending_employee` (`employee_id`),
  CONSTRAINT `onlineattendancepending_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.overtime
CREATE TABLE IF NOT EXISTS `overtime` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `approved_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `telegram_chat_id` int DEFAULT NULL,
  `telegram_message_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_overtime_dates` (`start_date`,`end_date`),
  KEY `idx_overtime_employee` (`employee_id`),
  KEY `idx_overtime_status` (`status`),
  CONSTRAINT `overtime_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE,
  CONSTRAINT `overtime_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `employee` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.payroll
CREATE TABLE IF NOT EXISTS `payroll` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `payroll_period_id` int NOT NULL,
  `employee_id` int NOT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `allowance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `overtime` decimal(12,2) NOT NULL DEFAULT '0.00',
  `bonus` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deduction` decimal(12,2) NOT NULL DEFAULT '0.00',
  `tax` decimal(12,2) NOT NULL DEFAULT '0.00',
  `gross_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `net_salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `status` enum('draft','generated','approved','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `payslip_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_payroll_period_employee` (`payroll_period_id`,`employee_id`),
  KEY `idx_payroll_company_period` (`company_id`,`payroll_period_id`),
  KEY `idx_payroll_employee` (`employee_id`),
  KEY `idx_payroll_status` (`status`),
  CONSTRAINT `payroll_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_ibfk_2` FOREIGN KEY (`payroll_period_id`) REFERENCES `payrollperiod` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payroll_ibfk_3` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.payrolladjustment
CREATE TABLE IF NOT EXISTS `payrolladjustment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payroll_id` int NOT NULL,
  `field` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_value` decimal(12,2) DEFAULT NULL,
  `new_value` decimal(12,2) DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `adjusted_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payrolladjustment_payroll` (`payroll_id`),
  KEY `idx_payrolladjustment_user` (`adjusted_by`),
  CONSTRAINT `payrolladjustment_ibfk_1` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payrolladjustment_ibfk_2` FOREIGN KEY (`adjusted_by`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.payrollitem
CREATE TABLE IF NOT EXISTS `payrollitem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payroll_id` int NOT NULL,
  `type` enum('base_salary','allowance','overtime','bonus','deduction','tax') COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payrollitem_payroll` (`payroll_id`),
  KEY `idx_payrollitem_type` (`type`),
  CONSTRAINT `payrollitem_ibfk_1` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.payrollperiod
CREATE TABLE IF NOT EXISTS `payrollperiod` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `pay_date` datetime NOT NULL,
  `status` enum('draft','generated','approved','paid') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payrollperiod_company` (`company_id`),
  KEY `idx_payrollperiod_pay_date` (`pay_date`),
  KEY `idx_payrollperiod_status` (`status`),
  CONSTRAINT `payrollperiod_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.positions
CREATE TABLE IF NOT EXISTS `positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_position_department` (`department_id`),
  CONSTRAINT `fk_position_department` FOREIGN KEY (`department_id`) REFERENCES `department` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.role
CREATE TABLE IF NOT EXISTS `role` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_role_company` (`name`,`company_id`),
  KEY `idx_role_company` (`company_id`),
  CONSTRAINT `role_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.rolebaseaccess
CREATE TABLE IF NOT EXISTS `rolebaseaccess` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_roleaccess_path` (`path`(255)),
  KEY `idx_roleaccess_role` (`role_id`),
  CONSTRAINT `rolebaseaccess_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.timemode
CREATE TABLE IF NOT EXISTS `timemode` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int NOT NULL,
  `remark` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timemode_company` (`company_id`),
  CONSTRAINT `timemode_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.timesheet
CREATE TABLE IF NOT EXISTS `timesheet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time_in` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lunch_out` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lunch_in` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `time_out` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `require_time_in` tinyint(1) DEFAULT '1',
  `require_lunch_out` tinyint(1) DEFAULT '0',
  `require_lunch_in` tinyint(1) DEFAULT '0',
  `require_time_out` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timesheet_company` (`company_id`),
  CONSTRAINT `timesheet_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

-- Dumping structure for table hrms.user
CREATE TABLE IF NOT EXISTS `user` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` int DEFAULT NULL,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_default_password` tinyint(1) NOT NULL DEFAULT '1',
  `token_version` int NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_user_employee` (`employee_id`),
  KEY `idx_user_username` (`username`),
  CONSTRAINT `user_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employee` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
