-- MySQL dump 10.13  Distrib 8.4.3, for Win64 (x86_64)
--
-- Host: localhost    Database: hrms
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `announcement`
--

DROP TABLE IF EXISTS `announcement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `announcement` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcement`
--

LOCK TABLES `announcement` WRITE;
/*!40000 ALTER TABLE `announcement` DISABLE KEYS */;
/*!40000 ALTER TABLE `announcement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `asset`
--

DROP TABLE IF EXISTS `asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asset` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `asset`
--

LOCK TABLES `asset` WRITE;
/*!40000 ALTER TABLE `asset` DISABLE KEYS */;
INSERT INTO `asset` VALUES (1,3,1,'Macbook M4','BY_001','good','assigned',5,'2026-06-17 01:48:14','2026-06-17 01:47:55','2026-06-17 01:47:55'),(2,3,2,'Logitic Mouse','BY_0002','good','assigned',5,'2026-06-17 07:57:47','2026-06-17 01:48:51','2026-06-17 01:48:51');
/*!40000 ALTER TABLE `asset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assetcategory`
--

DROP TABLE IF EXISTS `assetcategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetcategory` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assetcategory`
--

LOCK TABLES `assetcategory` WRITE;
/*!40000 ALTER TABLE `assetcategory` DISABLE KEYS */;
INSERT INTO `assetcategory` VALUES (1,3,'Laptop','','2026-06-17 01:46:22','2026-06-17 01:46:22'),(2,3,'Mouse','','2026-06-17 01:46:27','2026-06-17 01:46:27'),(3,3,'Phone','','2026-06-17 01:46:31','2026-06-17 01:46:31'),(4,3,'Chair','','2026-06-17 01:46:38','2026-06-17 01:46:38'),(5,3,'Keyboard','','2026-06-17 01:46:44','2026-06-17 01:46:44');
/*!40000 ALTER TABLE `assetcategory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assethistory`
--

DROP TABLE IF EXISTS `assethistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assethistory` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assethistory`
--

LOCK TABLES `assethistory` WRITE;
/*!40000 ALTER TABLE `assethistory` DISABLE KEYS */;
INSERT INTO `assethistory` VALUES (1,1,3,5,'good',NULL,'2026-06-17 01:48:15',NULL,'2026-06-17 01:48:15'),(2,2,3,5,'good',NULL,'2026-06-17 07:57:47',NULL,'2026-06-17 07:57:47');
/*!40000 ALTER TABLE `assethistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assetrequest`
--

DROP TABLE IF EXISTS `assetrequest`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assetrequest` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assetrequest`
--

LOCK TABLES `assetrequest` WRITE;
/*!40000 ALTER TABLE `assetrequest` DISABLE KEYS */;
INSERT INTO `assetrequest` VALUES (1,3,5,2,2,'assignment','Testing \n\n','assigned',6,NULL,'test','2026-06-17 02:14:47','2026-06-17 02:14:47');
/*!40000 ALTER TABLE `assetrequest` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendancerecord`
--

DROP TABLE IF EXISTS `attendancerecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendancerecord` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendancerecord`
--

LOCK TABLES `attendancerecord` WRITE;
/*!40000 ALTER TABLE `attendancerecord` DISABLE KEYS */;
INSERT INTO `attendancerecord` VALUES (1,5,4,'present','FINGER','2026-06-10 11:36:07',0,0,'2026-06-10 11:36:07','2026-06-10 11:36:07'),(2,5,4,'present','FINGER','2026-06-10 12:41:22',0,0,'2026-06-10 12:41:22','2026-06-10 12:41:22');
/*!40000 ALTER TABLE `attendancerecord` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditlog`
--

DROP TABLE IF EXISTS `auditlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditlog` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditlog`
--

LOCK TABLES `auditlog` WRITE;
/*!40000 ALTER TABLE `auditlog` DISABLE KEYS */;
INSERT INTO `auditlog` VALUES (1,1,3,'Employee','UPDATE','Updated employee ID: 2','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:03:32'),(2,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:04:54'),(3,1,3,'Location','UPDATE','Updated location: Norton University','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:05:40'),(4,1,3,'Department','UPDATE','Updated department ID: 3 to System Development','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:06:03'),(5,1,3,'Department','CREATE','Created department: Human Resource','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:06:08'),(6,1,3,'Employee','CREATE','Created new employee: kim linna','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:07:28'),(7,1,3,'Department','UPDATE','Updated department ID: 4 to Human Resource','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:07:55'),(8,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:11:06'),(9,1,3,'Department','DEACTIVATE','Deactivated department ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:13:54'),(10,1,3,'Department','DEACTIVATE','Deactivated department ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:13:57'),(11,1,3,'Department','ACTIVATE','Activated department ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:14:06'),(12,1,3,'Department','ACTIVATE','Activated department ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:14:07'),(13,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:17:48'),(14,1,3,'Employee','CREATE','Created new employee: kim  heng','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:18:46'),(15,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:18:57'),(16,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:19:24'),(17,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 06:19:31'),(18,1,3,'Employee','UPDATE','Updated employee ID: 2','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:45:49'),(19,1,3,'Employee','CREATE','Created new employee: em sokhai','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:46:49'),(20,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:47:03'),(21,1,3,'EmployeeLocation','UPDATE','Assigned locations for employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:49:45'),(22,1,3,'EmployeeLocation','UPDATE','Assigned locations for employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:49:49'),(23,1,3,'EmployeeLocation','UPDATE','Assigned locations for employee ID: 2','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:49:54'),(24,1,3,'EmployeeLocation','UPDATE','Assigned locations for employee ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:49:59'),(25,1,3,'EmployeeLocation','UPDATE','Assigned locations for employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:50:06'),(26,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:50:45'),(27,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:50:53'),(28,1,3,'Leave Profile','SYNC','Synced leave profiles for employee','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:51:01'),(29,4,3,'Leave','CREATE','Requested leave from 2026-06-10 to 2026-06-10','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 08:56:41'),(30,1,3,'Employee','UPDATE','Updated employee ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 08:59:23'),(31,1,3,'Employee','UPDATE','Updated employee ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 09:00:53'),(32,1,3,'Employee','DELETE','Deleted employee ID: 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 09:01:19'),(33,1,3,'Employee','CREATE','Created new employee: kim long','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 09:01:54'),(34,1,3,'Department','UPDATE','Updated department ID: 3 to System Development','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 09:02:29'),(35,4,3,'Leave','CREATE','Requested leave from 2026-06-10 to 2026-06-10','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:30:13'),(36,4,3,'Leave','CANCEL','Cancelled leave request #2','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:30:27'),(37,4,3,'Leave','CREATE','Requested leave from 2026-06-10 to 2026-06-10','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:30:39'),(38,4,3,'Leave','CANCEL','Cancelled leave request #4','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:38:11'),(39,4,3,'Overtime','CREATE','Created overtime request','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:40:10'),(40,1,3,'Overtime','REJECT','Rejected overtime request #1','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 09:40:35'),(41,4,3,'Leave','CREATE','Requested leave from 2026-06-11 to 2026-06-11','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:48:20'),(42,4,3,'Leave','CREATE','Requested leave from 2026-06-10 to 2026-06-10','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 09:51:52'),(43,4,3,'Leave','CREATE','Requested leave from 2026-06-13 to 2026-06-13','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:31:34'),(44,1,3,'Leave','APPROVE','Approved leave request #7','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-10 11:35:55'),(45,4,3,'Attendance','CLOCK','Employee clocked TimeOut','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:36:07'),(46,4,3,'Leave','CREATE','Requested leave for dates: 2026-06-14, 2026-06-16','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:39:48'),(47,4,3,'Leave','CANCEL','Cancelled leave request #9','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:47:47'),(48,4,3,'Leave','CANCEL','Cancelled leave request #8','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:47:49'),(49,4,3,'Leave','CREATE','Requested leave for dates: 2026-06-14, 2026-06-16','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 11:48:26'),(50,4,3,'Overtime','CREATE','Created overtime request','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 12:01:54'),(51,4,3,'Attendance','CLOCK','Employee clocked TimeOut','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-10 12:41:22'),(52,1,3,'Holiday','CREATE','Created holiday: testing (2026-06-14 to 2026-06-14)','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-12 18:06:17'),(53,1,3,'Payroll','PAID','Marked payroll period 3 as paid','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:35:44'),(54,1,3,'Payroll','GENERATE','Generated payroll for period 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:36:05'),(55,1,3,'Payroll','CREATE','Created payroll period: June 2026','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:37:13'),(56,1,3,'Payroll','APPROVE','Approved payroll period 4','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:37:44'),(57,1,3,'Payroll','PAID','Marked payroll period 4 as paid','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:37:48'),(58,1,3,'Payroll','GENERATE','Generated payroll for period 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:38:00'),(59,1,3,'Overtime','APPROVE','Approved overtime request #2','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 16:59:26'),(60,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 17:33:22'),(61,1,3,'Employee','UPDATE','Updated employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 17:36:57'),(62,1,3,'Employee','UPDATE','Updated employee ID: 6','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 17:37:13'),(63,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 17:42:20'),(64,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:03:15'),(65,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:03:21'),(66,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:03:29'),(67,1,3,'Employee','UPDATE','Updated employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:04:22'),(68,1,3,'Employee','UPDATE','Updated employee ID: 6','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:04:32'),(69,1,3,'Employee','UPDATE','Updated employee ID: 2','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-15 18:04:50'),(70,1,3,'Employee','UPDATE','Updated employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 06:08:07'),(71,1,3,'Payroll','UPDATE','Synced base salary for payroll record 19','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 06:28:29'),(72,1,3,'Payroll','UPDATE','Synced base salaries for payroll period 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 06:34:38'),(73,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 07:37:39'),(74,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 07:37:52'),(75,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 07:41:25'),(76,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 07:46:57'),(77,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 07:47:33'),(78,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 07:54:14'),(79,1,3,'Payroll','CREATE','Created payroll period: January 2026','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 08:17:59'),(80,1,3,'Payroll','GENERATE','Generated payroll for period 6','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 08:18:04'),(81,1,3,'Payroll','UPDATE','Synced base salaries for payroll period 6','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 08:18:06'),(82,1,3,'Payroll','Delete Payroll Period','Deleted payroll period ID 6','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 09:30:48'),(83,1,3,'Payroll','CREATE','Created payroll period: January 2026','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 09:31:20'),(84,1,3,'Payroll','GENERATE','Generated payroll for period 7','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 09:31:27'),(85,1,3,'Payroll','APPROVE','Approved payroll period 7','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 09:31:46'),(86,1,3,'Payroll','PAID','Marked payroll period 7 as paid','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36','2026-06-16 09:31:52'),(87,1,3,'Employee','CREATE','Created new employee: bun mark','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 14:42:41'),(88,1,3,'Employee','UPDATE','Updated employee ID: 7','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 14:48:01'),(89,1,3,'Employee','UPDATE','Updated employee ID: 7','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 14:51:12'),(90,1,3,'Employee','UPDATE','Updated employee ID: 3','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 15:53:31'),(91,1,3,'Payroll','CREATE','Created payroll period: May 2026','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 16:50:08'),(92,1,3,'Payroll','GENERATE','Generated payroll for period 8','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 16:50:16'),(93,1,3,'Payroll','APPROVE','Approved payroll period 8','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 16:50:19'),(94,1,3,'Payroll','PAID','Marked payroll period 8 as paid','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 16:50:23'),(95,1,3,'Employee','UPDATE','Updated employee ID: 5','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-16 16:57:30'),(96,1,3,'Company','UPDATE','Updated company information for Bayon Market','127.0.0.1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','2026-06-17 04:27:55'),(97,4,3,'Leave','CREATE','Requested leave for dates: 2026-06-18','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-17 05:57:16'),(98,5,3,'Overtime','CREATE','Created overtime request','172.20.10.1','Expo/1017756 CFNetwork/3860.600.12 Darwin/25.5.0','2026-06-17 06:18:12');
/*!40000 ALTER TABLE `auditlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company`
--

DROP TABLE IF EXISTS `company`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company`
--

LOCK TABLES `company` WRITE;
/*!40000 ALTER TABLE `company` DISABLE KEYS */;
INSERT INTO `company` VALUES (3,'Bayon Market','1234567890','Bayon@gmail.com','#D52E32','#424678','/uploads/logos/1781071494182_photo_2023-07-31_14-32-24.jpg','-5104329689','8996746206:AAFfkD_dKMKpcq6ZIlmplHU4_GrgP0q3liQ','2026-06-10 06:02:26','2026-06-10 06:02:26');
/*!40000 ALTER TABLE `company` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dayofweek`
--

DROP TABLE IF EXISTS `dayofweek`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dayofweek` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dayofweek`
--

LOCK TABLES `dayofweek` WRITE;
/*!40000 ALTER TABLE `dayofweek` DISABLE KEYS */;
INSERT INTO `dayofweek` VALUES (1,3,'Normal_Employee','ne_001',1,1,1,1,1,1,1,NULL,'2026-06-10 08:49:10','2026-06-10 08:49:10');
/*!40000 ALTER TABLE `dayofweek` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `department`
--

DROP TABLE IF EXISTS `department`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `department` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `department`
--

LOCK TABLES `department` WRITE;
/*!40000 ALTER TABLE `department` DISABLE KEYS */;
INSERT INTO `department` VALUES (3,'System Development',6,3,1,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(4,'Human Resource',3,3,1,'2026-06-10 06:06:08','2026-06-10 06:06:08');
/*!40000 ALTER TABLE `department` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document`
--

DROP TABLE IF EXISTS `document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document`
--

LOCK TABLES `document` WRITE;
/*!40000 ALTER TABLE `document` DISABLE KEYS */;
/*!40000 ALTER TABLE `document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documenttype`
--

DROP TABLE IF EXISTS `documenttype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documenttype` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `company_id` int NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doctype_company` (`company_id`),
  CONSTRAINT `documenttype_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `company` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documenttype`
--

LOCK TABLES `documenttype` WRITE;
/*!40000 ALTER TABLE `documenttype` DISABLE KEYS */;
INSERT INTO `documenttype` VALUES (1,'Passport',3,'2026-06-10 11:34:58','2026-06-10 11:34:58'),(2,'Card Id',3,'2026-06-10 11:35:06','2026-06-10 11:35:06');
/*!40000 ALTER TABLE `documenttype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employee`
--

DROP TABLE IF EXISTS `employee`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employee`
--

LOCK TABLES `employee` WRITE;
/*!40000 ALTER TABLE `employee` DISABLE KEYS */;
INSERT INTO `employee` VALUES (2,'ieng','kimlong',NULL,'male','1234567890',NULL,'admin@example.com',NULL,'/uploads/profiles/1781071411971_photo_2026-05-04_08-59-47.jpg',NULL,NULL,2,3,NULL,NULL,NULL,3,'active','single',NULL,NULL,NULL,0,0,0,0,0,NULL,NULL,NULL,'alive',NULL,NULL,NULL,'alive',NULL,NULL,NULL,'2026-06-10 06:02:26','2026-06-10 06:02:26','161f424a28ff2f5f75b4016184939103:23c1c6c575f9b1bd207731fc3455c4a8'),(3,'kim','linna',18,'female','0964514008',NULL,'linna@gmail.com','Sulthan Bathery - Kunthanni - Thovarimala Rd, Chettimoola',NULL,3,4,3,3,'@lo_ng1234','7719243880','2026-05-27 00:00:00',3,'active','single',NULL,NULL,NULL,0,0,0,0,0,NULL,NULL,NULL,'alive',NULL,NULL,NULL,'alive',NULL,NULL,NULL,'2026-06-10 06:07:28','2026-06-10 06:07:28','c9178dcd2a2f6840e0acf32b16b3bb9e:f097a41ad79595b5cee9c52414336d2f'),(5,'em','sokhai',18,'male','0964514044',NULL,'hai@gmail.com','Sulthan Bathery - Kunthanni - Thovarimala Rd, Chettimoola','/uploads/profiles/1781629049681_photo_2025-12-01_13-26-32.jpg',4,3,3,3,'@GenZHai007','5644263246','2026-06-10 00:00:00',3,'active','single',NULL,NULL,NULL,0,0,0,0,0,NULL,NULL,NULL,'alive',NULL,NULL,NULL,'alive',NULL,NULL,NULL,'2026-06-10 08:46:49','2026-06-10 08:46:49','da6f8a1160adb31664dd0041f7e63bd7:d526c3239f6b48bca9bc32c66e8b0de5'),(6,'kim','long',18,'male','0964514034',NULL,'long@gmail.com','Sulthan Bathery - Kunthanni - Thovarimala Rd, Chettimoola',NULL,2,3,3,NULL,'@Lo_ng999','1104299436','2026-06-10 00:00:00',3,'active','single',NULL,NULL,NULL,0,0,0,0,0,NULL,NULL,NULL,'alive',NULL,NULL,NULL,'alive',NULL,NULL,NULL,'2026-06-10 09:01:53','2026-06-10 09:01:53','c3f541a703ce5225815fa5224e14682d:879f13b55e16c509f50d853ad65567c2'),(7,'bun','mark',18,'male','0964514424',NULL,'mark@gmail.com','Sulthan Bathery - Kunthanni - Thovarimala Rd, Chettimoola',NULL,5,4,3,NULL,NULL,NULL,'2026-06-16 00:00:00',3,'inactive','single',NULL,NULL,NULL,0,0,0,0,0,NULL,NULL,NULL,'alive',NULL,NULL,NULL,'alive',NULL,NULL,NULL,'2026-06-16 14:42:41','2026-06-16 14:42:41','9a76d306bdd9d83072d3387554c66063:0805c83bff1f1367c42bea17a01af5a3');
/*!40000 ALTER TABLE `employee` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employeekpi`
--

DROP TABLE IF EXISTS `employeekpi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employeekpi` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employeekpi`
--

LOCK TABLES `employeekpi` WRITE;
/*!40000 ALTER TABLE `employeekpi` DISABLE KEYS */;
INSERT INTO `employeekpi` VALUES (1,5,1,92,NULL,'active','2026-06-16 04:51:33','2026-06-16 04:51:33','completed'),(2,6,1,NULL,NULL,'active','2026-06-16 04:51:33','2026-06-16 04:51:33','pending_manager'),(9,2,1,NULL,NULL,'active','2026-06-17 00:52:48','2026-06-17 00:52:48','pending_manager'),(10,3,1,NULL,NULL,'active','2026-06-17 00:52:48','2026-06-17 00:52:48','pending_manager');
/*!40000 ALTER TABLE `employeekpi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employeelocation`
--

DROP TABLE IF EXISTS `employeelocation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employeelocation` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employeelocation`
--

LOCK TABLES `employeelocation` WRITE;
/*!40000 ALTER TABLE `employeelocation` DISABLE KEYS */;
/*!40000 ALTER TABLE `employeelocation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `employeeworkingprofile`
--

DROP TABLE IF EXISTS `employeeworkingprofile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employeeworkingprofile` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employeeworkingprofile`
--

LOCK TABLES `employeeworkingprofile` WRITE;
/*!40000 ALTER TABLE `employeeworkingprofile` DISABLE KEYS */;
INSERT INTO `employeeworkingprofile` VALUES (1,3,1,0,'2026-06-10 08:49:21','2026-06-10 08:49:21'),(3,5,1,0,'2026-06-10 08:49:36','2026-06-10 08:49:36');
/*!40000 ALTER TABLE `employeeworkingprofile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `holiday`
--

DROP TABLE IF EXISTS `holiday`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `holiday` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `holiday`
--

LOCK TABLES `holiday` WRITE;
/*!40000 ALTER TABLE `holiday` DISABLE KEYS */;
INSERT INTO `holiday` VALUES (1,'testing','2026-06-14 00:00:00','2026-06-14 00:00:00',3,'2026-06-12 18:06:16','2026-06-12 18:06:16');
/*!40000 ALTER TABLE `holiday` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpicycle`
--

DROP TABLE IF EXISTS `kpicycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpicycle` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpicycle`
--

LOCK TABLES `kpicycle` WRITE;
/*!40000 ALTER TABLE `kpicycle` DISABLE KEYS */;
INSERT INTO `kpicycle` VALUES (1,3,'2026 Annual Performance Cycle','2026-01-01 00:00:00','2026-12-31 23:59:59','active','2026-06-16 04:51:32','2026-06-16 04:51:32');
/*!40000 ALTER TABLE `kpicycle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpigoal`
--

DROP TABLE IF EXISTS `kpigoal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpigoal` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpigoal`
--

LOCK TABLES `kpigoal` WRITE;
/*!40000 ALTER TABLE `kpigoal` DISABLE KEYS */;
INSERT INTO `kpigoal` VALUES (1,1,'Attendance','Maintain 98% Attendance',98,'%',20,95,'2026-06-16 04:51:33','2026-06-16 04:51:33',95,95),(2,1,'Performance','Task Completion Rate',100,'%',40,90,'2026-06-16 04:51:33','2026-06-16 04:51:33',90,90),(3,1,'Teamwork','Peer Review Score',5,'rating',20,95,'2026-06-16 04:51:33','2026-06-16 04:51:33',95,95),(4,1,'Professionalism','No Disciplinary Actions',100,'%',20,85,'2026-06-16 04:51:33','2026-06-16 04:51:33',85,85),(5,2,'Attendance','Maintain 98% Attendance',98,'%',20,0,'2026-06-16 04:51:33','2026-06-16 04:51:33',0,0),(6,2,'Performance','Task Completion Rate',100,'%',40,0,'2026-06-16 04:51:33','2026-06-16 04:51:33',0,0),(7,2,'Teamwork','Peer Review Score',5,'rating',20,0,'2026-06-16 04:51:33','2026-06-16 04:51:33',0,0),(8,2,'Professionalism','No Disciplinary Actions',100,'%',20,0,'2026-06-16 04:51:33','2026-06-16 04:51:33',0,0),(9,9,'Attendance','Maintain 98% Attendance',98,'%',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(10,9,'Performance','Task Completion Rate',100,'%',40,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(11,9,'Teamwork','Peer Review Score',5,'rating',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(12,9,'Professionalism','No Disciplinary Actions',100,'%',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(13,10,'Attendance','Maintain 98% Attendance',98,'%',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(14,10,'Performance','Task Completion Rate',100,'%',40,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(15,10,'Teamwork','Peer Review Score',5,'rating',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0),(16,10,'Professionalism','No Disciplinary Actions',100,'%',20,0,'2026-06-17 00:52:48','2026-06-17 00:52:48',0,0);
/*!40000 ALTER TABLE `kpigoal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpigoalprogress`
--

DROP TABLE IF EXISTS `kpigoalprogress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpigoalprogress` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpigoalprogress`
--

LOCK TABLES `kpigoalprogress` WRITE;
/*!40000 ALTER TABLE `kpigoalprogress` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpigoalprogress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpireview`
--

DROP TABLE IF EXISTS `kpireview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpireview` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpireview`
--

LOCK TABLES `kpireview` WRITE;
/*!40000 ALTER TABLE `kpireview` DISABLE KEYS */;
/*!40000 ALTER TABLE `kpireview` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpitemplate`
--

DROP TABLE IF EXISTS `kpitemplate`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpitemplate` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpitemplate`
--

LOCK TABLES `kpitemplate` WRITE;
/*!40000 ALTER TABLE `kpitemplate` DISABLE KEYS */;
INSERT INTO `kpitemplate` VALUES (1,3,'Software Engineer KPI Template','Standard KPI for all software engineering roles','2026-06-16 04:51:33','2026-06-16 04:51:33');
/*!40000 ALTER TABLE `kpitemplate` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kpitemplategoal`
--

DROP TABLE IF EXISTS `kpitemplategoal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpitemplategoal` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpitemplategoal`
--

LOCK TABLES `kpitemplategoal` WRITE;
/*!40000 ALTER TABLE `kpitemplategoal` DISABLE KEYS */;
INSERT INTO `kpitemplategoal` VALUES (1,1,'Attendance','Maintain 98% Attendance',98,'%',20,'2026-06-16 04:51:33','2026-06-16 04:51:33'),(2,1,'Performance','Task Completion Rate',100,'%',40,'2026-06-16 04:51:33','2026-06-16 04:51:33'),(3,1,'Teamwork','Peer Review Score',5,'rating',20,'2026-06-16 04:51:33','2026-06-16 04:51:33'),(4,1,'Professionalism','No Disciplinary Actions',100,'%',20,'2026-06-16 04:51:33','2026-06-16 04:51:33');
/*!40000 ALTER TABLE `kpitemplategoal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaveprofile`
--

DROP TABLE IF EXISTS `leaveprofile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaveprofile` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaveprofile`
--

LOCK TABLES `leaveprofile` WRITE;
/*!40000 ALTER TABLE `leaveprofile` DISABLE KEYS */;
INSERT INTO `leaveprofile` VALUES (1,3,1,10,0,10,'2026-06-10 06:19:24','2026-06-10 06:19:24'),(2,3,2,5,0,5,'2026-06-10 06:19:24','2026-06-10 06:19:24'),(3,3,3,90,0,90,'2026-06-10 06:19:24','2026-06-10 06:19:24'),(4,3,4,0,0,0,'2026-06-10 06:19:24','2026-06-10 06:19:24'),(8,5,1,10,2,8,'2026-06-10 08:47:03','2026-06-10 08:47:03'),(9,5,2,5,0,5,'2026-06-10 08:47:03','2026-06-10 08:47:03'),(10,5,4,0,2,-2,'2026-06-10 08:47:03','2026-06-10 08:47:03'),(11,3,5,7,0,7,'2026-06-10 08:50:45','2026-06-10 08:50:45'),(13,5,5,7,0,7,'2026-06-10 08:51:01','2026-06-10 08:51:01');
/*!40000 ALTER TABLE `leaveprofile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leaverecord`
--

DROP TABLE IF EXISTS `leaverecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leaverecord` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leaverecord`
--

LOCK TABLES `leaverecord` WRITE;
/*!40000 ALTER TABLE `leaverecord` DISABLE KEYS */;
INSERT INTO `leaverecord` VALUES (1,5,1,'2026-06-10 00:00:00','2026-06-10 00:00:00','test........','rejected',6,'2026-06-10 08:56:40','2026-06-10 08:56:40',NULL,NULL,NULL,NULL),(2,5,1,'2026-06-10 00:00:00','2026-06-10 00:00:00','Testing leav','rejected',NULL,'2026-06-10 09:30:12','2026-06-10 09:30:12',NULL,NULL,NULL,NULL),(3,5,1,'2026-06-10 00:00:00','2026-06-10 00:00:00','Testing leav','approved',6,'2026-06-10 09:30:39','2026-06-10 09:30:39',NULL,NULL,NULL,NULL),(4,5,1,'2026-06-10 00:00:00','2026-06-10 00:00:00','Test........','rejected',6,'2026-06-10 09:37:52','2026-06-10 09:37:52',NULL,NULL,NULL,NULL),(5,5,4,'2026-06-11 00:00:00','2026-06-11 00:00:00','Testing.....','approved',6,'2026-06-10 09:48:19','2026-06-10 09:48:19',NULL,52,'lo_ng999','-5104329689'),(6,5,4,'2026-06-10 00:00:00','2026-06-10 00:00:00','Bbbbb.......','approved',6,'2026-06-10 09:51:51','2026-06-10 09:51:51',NULL,53,'lo_ng999','-5104329689'),(7,5,1,'2026-06-12 17:00:00','2026-06-12 17:00:00','Testing.....','approved',2,'2026-06-10 11:31:33','2026-06-10 11:31:33',NULL,61,'lo_ng999','-5104329689'),(8,5,1,'2026-06-13 17:00:00','2026-06-13 17:00:00','Hbbb','rejected',NULL,'2026-06-10 11:39:47','2026-06-10 11:39:47',NULL,63,'lo_ng999','-5104329689'),(9,5,1,'2026-06-15 17:00:00','2026-06-15 17:00:00','Hbbb','rejected',NULL,'2026-06-10 11:39:47','2026-06-10 11:39:47',NULL,63,'lo_ng999','-5104329689'),(10,5,1,'2026-06-13 17:00:00','2026-06-13 17:00:00','Testing','rejected',6,'2026-06-10 11:48:25','2026-06-10 11:48:25',NULL,64,'lo_ng999','-5104329689'),(11,5,1,'2026-06-15 17:00:00','2026-06-15 17:00:00','Testing','rejected',6,'2026-06-10 11:48:25','2026-06-10 11:48:25',NULL,64,'lo_ng999','-5104329689'),(12,5,1,'2026-06-17 17:00:00','2026-06-17 17:00:00','Testing tho','pending',NULL,'2026-06-17 05:57:16','2026-06-17 05:57:16',NULL,66,'lo_ng999','-5104329689');
/*!40000 ALTER TABLE `leaverecord` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `leavetype`
--

DROP TABLE IF EXISTS `leavetype`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `leavetype` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `leavetype`
--

LOCK TABLES `leavetype` WRITE;
/*!40000 ALTER TABLE `leavetype` DISABLE KEYS */;
INSERT INTO `leavetype` VALUES (1,'Annual Leave','AL',10,3,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(2,'Sick Leave','SL',5,3,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(3,'Maternity Leave','ML',90,3,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(4,'Unpaid Leave','UP',0,3,'2026-06-10 06:19:16','2026-06-10 06:19:16'),(5,'Special Leave','SPL',7,3,'2026-06-10 08:50:32','2026-06-10 08:50:32');
/*!40000 ALTER TABLE `leavetype` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `location`
--

DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `location` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `location`
--

LOCK TABLES `location` WRITE;
/*!40000 ALTER TABLE `location` DISABLE KEYS */;
INSERT INTO `location` VALUES (3,'Norton University',3,'104.93016341054185','11.588289461098544',300,'2026-06-10 06:02:26','2026-06-10 06:02:26');
/*!40000 ALTER TABLE `location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notification`
--

LOCK TABLES `notification` WRITE;
/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onlineattendance`
--

DROP TABLE IF EXISTS `onlineattendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onlineattendance` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onlineattendance`
--

LOCK TABLES `onlineattendance` WRITE;
/*!40000 ALTER TABLE `onlineattendance` DISABLE KEYS */;
/*!40000 ALTER TABLE `onlineattendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `onlineattendancepending`
--

DROP TABLE IF EXISTS `onlineattendancepending`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `onlineattendancepending` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `onlineattendancepending`
--

LOCK TABLES `onlineattendancepending` WRITE;
/*!40000 ALTER TABLE `onlineattendancepending` DISABLE KEYS */;
/*!40000 ALTER TABLE `onlineattendancepending` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `overtime`
--

DROP TABLE IF EXISTS `overtime`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `overtime` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `overtime`
--

LOCK TABLES `overtime` WRITE;
/*!40000 ALTER TABLE `overtime` DISABLE KEYS */;
INSERT INTO `overtime` VALUES (1,5,'2026-06-10 11:00:00','2026-06-10 13:00:00','Test','rejected',2,'2026-06-10 09:40:10','2026-06-10 09:40:10',NULL,NULL),(2,5,'2026-06-10 17:00:00','2026-06-10 17:00:00','Testing','approved',2,'2026-06-10 12:01:53','2026-06-10 12:01:53',NULL,NULL),(3,6,'2026-06-19 02:00:00','2026-06-19 10:00:00','Test','pending',NULL,'2026-06-17 06:18:11','2026-06-17 06:18:11',NULL,NULL);
/*!40000 ALTER TABLE `overtime` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payroll`
--

DROP TABLE IF EXISTS `payroll`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payroll` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payroll`
--

LOCK TABLES `payroll` WRITE;
/*!40000 ALTER TABLE `payroll` DISABLE KEYS */;
INSERT INTO `payroll` VALUES (1,3,1,2,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(2,3,1,3,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(3,3,1,5,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(4,3,1,6,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(5,3,2,2,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(6,3,2,3,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(7,3,2,5,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(8,3,2,6,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid',NULL,'2026-06-15 16:25:59','2026-06-15 16:25:59'),(9,3,3,2,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_9_1781541343952.pdf','2026-06-15 16:25:59','2026-06-15 16:35:44'),(10,3,3,3,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_10_1781541344000.pdf','2026-06-15 16:25:59','2026-06-15 16:35:44'),(11,3,3,5,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_11_1781541343687.pdf','2026-06-15 16:25:59','2026-06-15 16:35:44'),(12,3,3,6,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_12_1781541344044.pdf','2026-06-15 16:25:59','2026-06-15 16:35:44'),(13,3,4,2,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_13_1781541468308.pdf','2026-06-15 16:25:59','2026-06-15 16:37:48'),(14,3,4,3,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_14_1781541468343.pdf','2026-06-15 16:25:59','2026-06-15 16:37:48'),(15,3,4,5,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_15_1781541468247.pdf','2026-06-15 16:25:59','2026-06-15 16:37:48'),(16,3,4,6,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_16_1781541468380.pdf','2026-06-15 16:25:59','2026-06-15 16:37:48'),(17,3,5,2,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'generated',NULL,'2026-06-15 16:38:00','2026-06-15 16:38:00'),(18,3,5,3,600.00,60.00,0.00,0.00,0.00,33.00,660.00,627.00,'generated',NULL,'2026-06-15 16:38:00','2026-06-15 16:38:00'),(19,3,5,5,300.00,60.00,0.00,0.00,0.00,0.00,360.00,360.00,'generated',NULL,'2026-06-15 16:38:00','2026-06-16 06:28:29'),(20,3,5,6,700.00,60.00,0.00,0.00,0.00,33.32,760.00,726.68,'generated',NULL,'2026-06-15 16:38:00','2026-06-16 06:34:38'),(25,3,7,2,600.00,60.00,0.00,0.00,0.00,23.32,660.00,636.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_25_1781602312383.pdf','2026-06-16 09:31:27','2026-06-16 09:31:52'),(26,3,7,3,600.00,60.00,0.00,0.00,0.00,23.32,660.00,636.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_26_1781602312424.pdf','2026-06-16 09:31:27','2026-06-16 09:31:52'),(27,3,7,5,300.00,30.00,0.00,0.00,0.00,0.00,330.00,330.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_27_1781628025720.pdf','2026-06-16 09:31:27','2026-06-16 09:31:52'),(28,3,7,6,700.00,70.00,0.00,0.00,0.00,34.32,770.00,735.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_28_1781602312455.pdf','2026-06-16 09:31:27','2026-06-16 09:31:52'),(29,3,8,2,600.00,60.00,0.00,0.00,0.00,23.32,660.00,636.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_29_1781628622860.pdf','2026-06-16 16:50:16','2026-06-16 16:50:23'),(30,3,8,3,600.00,60.00,0.00,0.00,0.00,23.32,660.00,636.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_30_1781628622898.pdf','2026-06-16 16:50:16','2026-06-16 16:50:23'),(31,3,8,5,300.00,30.00,0.00,0.00,0.00,0.00,330.00,330.00,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_31_1781631423446.pdf','2026-06-16 16:50:16','2026-06-16 16:50:23'),(32,3,8,6,700.00,70.00,0.00,0.00,0.00,34.32,770.00,735.68,'paid','D:\\HR_System_Sarana\\Backend\\public\\uploads\\payslips\\payslip_32_1781628622933.pdf','2026-06-16 16:50:16','2026-06-16 16:50:23');
/*!40000 ALTER TABLE `payroll` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payrolladjustment`
--

DROP TABLE IF EXISTS `payrolladjustment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payrolladjustment` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payrolladjustment`
--

LOCK TABLES `payrolladjustment` WRITE;
/*!40000 ALTER TABLE `payrolladjustment` DISABLE KEYS */;
INSERT INTO `payrolladjustment` VALUES (1,19,'base_salary',600.00,300.00,'Synced base salary from employee profile',1,'2026-06-16 06:28:29'),(2,20,'base_salary',600.00,700.00,'Bulk synced base salary from employee profile',1,'2026-06-16 06:34:38'),(3,1,'test',NULL,0.00,'test',1,'2026-06-16 16:20:57');
/*!40000 ALTER TABLE `payrolladjustment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payrollitem`
--

DROP TABLE IF EXISTS `payrollitem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payrollitem` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payrollitem`
--

LOCK TABLES `payrollitem` WRITE;
/*!40000 ALTER TABLE `payrollitem` DISABLE KEYS */;
INSERT INTO `payrollitem` VALUES (1,1,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(2,1,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(3,1,'tax','Tax',33.00,'2026-06-15 16:25:59'),(4,2,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(5,2,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(6,2,'tax','Tax',33.00,'2026-06-15 16:25:59'),(7,3,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(8,3,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(9,3,'tax','Tax',33.00,'2026-06-15 16:25:59'),(10,4,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(11,4,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(12,4,'tax','Tax',33.00,'2026-06-15 16:25:59'),(13,5,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(14,5,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(15,5,'tax','Tax',33.00,'2026-06-15 16:25:59'),(16,6,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(17,6,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(18,6,'tax','Tax',33.00,'2026-06-15 16:25:59'),(19,7,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(20,7,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(21,7,'tax','Tax',33.00,'2026-06-15 16:25:59'),(22,8,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(23,8,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(24,8,'tax','Tax',33.00,'2026-06-15 16:25:59'),(25,9,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(26,9,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(27,9,'tax','Tax',33.00,'2026-06-15 16:25:59'),(28,10,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(29,10,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(30,10,'tax','Tax',33.00,'2026-06-15 16:25:59'),(31,11,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(32,11,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(33,11,'tax','Tax',33.00,'2026-06-15 16:25:59'),(34,12,'base_salary','Base Salary',600.00,'2026-06-15 16:25:59'),(35,12,'allowance','Allowance',60.00,'2026-06-15 16:25:59'),(36,12,'tax','Tax',33.00,'2026-06-15 16:25:59'),(49,13,'base_salary','Base Salary',600.00,'2026-06-15 16:36:05'),(50,13,'allowance','Allowance',60.00,'2026-06-15 16:36:05'),(51,13,'tax','Tax',33.00,'2026-06-15 16:36:05'),(52,14,'base_salary','Base Salary',600.00,'2026-06-15 16:36:05'),(53,14,'allowance','Allowance',60.00,'2026-06-15 16:36:05'),(54,14,'tax','Tax',33.00,'2026-06-15 16:36:05'),(55,15,'base_salary','Base Salary',600.00,'2026-06-15 16:36:05'),(56,15,'allowance','Allowance',60.00,'2026-06-15 16:36:05'),(57,15,'tax','Tax',33.00,'2026-06-15 16:36:05'),(58,16,'base_salary','Base Salary',600.00,'2026-06-15 16:36:05'),(59,16,'allowance','Allowance',60.00,'2026-06-15 16:36:05'),(60,16,'tax','Tax',33.00,'2026-06-15 16:36:05'),(61,17,'base_salary','Base Salary',600.00,'2026-06-15 16:38:00'),(62,17,'allowance','Allowance',60.00,'2026-06-15 16:38:00'),(63,17,'tax','Tax',33.00,'2026-06-15 16:38:00'),(64,18,'base_salary','Base Salary',600.00,'2026-06-15 16:38:00'),(65,18,'allowance','Allowance',60.00,'2026-06-15 16:38:00'),(66,18,'tax','Tax',33.00,'2026-06-15 16:38:00'),(73,19,'base_salary','Base Salary',300.00,'2026-06-16 06:28:29'),(74,19,'allowance','Allowance',60.00,'2026-06-16 06:28:29'),(75,20,'base_salary','Base Salary',700.00,'2026-06-16 06:34:38'),(76,20,'allowance','Allowance',60.00,'2026-06-16 06:34:38'),(77,20,'tax','Salary Tax',33.32,'2026-06-16 06:34:38'),(89,25,'base_salary','Base Salary',600.00,'2026-06-16 09:31:27'),(90,25,'allowance','Allowance',60.00,'2026-06-16 09:31:27'),(91,25,'tax','Salary Tax',23.32,'2026-06-16 09:31:27'),(92,26,'base_salary','Base Salary',600.00,'2026-06-16 09:31:27'),(93,26,'allowance','Allowance',60.00,'2026-06-16 09:31:27'),(94,26,'tax','Salary Tax',23.32,'2026-06-16 09:31:27'),(95,27,'base_salary','Base Salary',300.00,'2026-06-16 09:31:27'),(96,27,'allowance','Allowance',30.00,'2026-06-16 09:31:27'),(97,28,'base_salary','Base Salary',700.00,'2026-06-16 09:31:27'),(98,28,'allowance','Allowance',70.00,'2026-06-16 09:31:27'),(99,28,'tax','Salary Tax',34.32,'2026-06-16 09:31:27'),(100,29,'base_salary','Base Salary',600.00,'2026-06-16 16:50:16'),(101,29,'allowance','Allowance',60.00,'2026-06-16 16:50:16'),(102,29,'tax','Salary Tax',23.32,'2026-06-16 16:50:16'),(103,30,'base_salary','Base Salary',600.00,'2026-06-16 16:50:16'),(104,30,'allowance','Allowance',60.00,'2026-06-16 16:50:16'),(105,30,'tax','Salary Tax',23.32,'2026-06-16 16:50:16'),(106,31,'base_salary','Base Salary',300.00,'2026-06-16 16:50:16'),(107,31,'allowance','Allowance',30.00,'2026-06-16 16:50:16'),(108,32,'base_salary','Base Salary',700.00,'2026-06-16 16:50:16'),(109,32,'allowance','Allowance',70.00,'2026-06-16 16:50:16'),(110,32,'tax','Salary Tax',34.32,'2026-06-16 16:50:16');
/*!40000 ALTER TABLE `payrollitem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payrollperiod`
--

DROP TABLE IF EXISTS `payrollperiod`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payrollperiod` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payrollperiod`
--

LOCK TABLES `payrollperiod` WRITE;
/*!40000 ALTER TABLE `payrollperiod` DISABLE KEYS */;
INSERT INTO `payrollperiod` VALUES (1,3,'August 2025','2025-08-01 00:00:00','2025-08-31 00:00:00','2025-09-05 00:00:00','paid','2026-06-15 16:25:59','2026-06-15 16:25:59'),(2,3,'September 2025','2025-09-01 00:00:00','2025-09-30 00:00:00','2025-10-05 00:00:00','paid','2026-06-15 16:25:59','2026-06-15 16:25:59'),(3,3,'October 2025','2025-10-01 00:00:00','2025-10-31 00:00:00','2025-11-05 00:00:00','paid','2026-06-15 16:25:59','2026-06-15 16:35:44'),(4,3,'November 2025','2025-11-01 00:00:00','2025-11-30 00:00:00','2025-12-05 00:00:00','paid','2026-06-15 16:25:59','2026-06-15 16:37:48'),(5,3,'June 2026','2026-06-01 00:00:00','2026-06-30 00:00:00','2026-07-01 00:00:00','generated','2026-06-15 16:37:13','2026-06-15 16:38:00'),(7,3,'January 2026','2026-01-01 00:00:00','2026-01-31 00:00:00','2026-02-01 00:00:00','paid','2026-06-16 09:31:20','2026-06-16 09:31:52'),(8,3,'May 2026','2026-05-01 00:00:00','2026-05-31 00:00:00','2026-06-01 00:00:00','paid','2026-06-16 16:50:08','2026-06-16 16:50:23');
/*!40000 ALTER TABLE `payrollperiod` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `positions`
--

DROP TABLE IF EXISTS `positions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `positions` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `positions`
--

LOCK TABLES `positions` WRITE;
/*!40000 ALTER TABLE `positions` DISABLE KEYS */;
INSERT INTO `positions` VALUES (1,'Manager',NULL,1,'2026-06-10 06:01:38','2026-06-10 06:01:38'),(2,'Manager',3,1,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(3,'Manager',4,1,'2026-06-10 06:06:28','2026-06-10 06:06:28'),(4,'Python Developement',3,1,'2026-06-10 06:06:48','2026-06-10 06:06:48'),(5,'Cleaner',4,1,'2026-06-10 06:06:58','2026-06-10 06:06:58');
/*!40000 ALTER TABLE `positions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role`
--

LOCK TABLES `role` WRITE;
/*!40000 ALTER TABLE `role` DISABLE KEYS */;
INSERT INTO `role` VALUES (2,'Admin',3,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(3,'Employee',3,'2026-06-10 06:10:50','2026-06-10 06:10:50');
/*!40000 ALTER TABLE `role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolebaseaccess`
--

DROP TABLE IF EXISTS `rolebaseaccess`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rolebaseaccess` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolebaseaccess`
--

LOCK TABLES `rolebaseaccess` WRITE;
/*!40000 ALTER TABLE `rolebaseaccess` DISABLE KEYS */;
/*!40000 ALTER TABLE `rolebaseaccess` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timemode`
--

DROP TABLE IF EXISTS `timemode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timemode` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timemode`
--

LOCK TABLES `timemode` WRITE;
/*!40000 ALTER TABLE `timemode` DISABLE KEYS */;
INSERT INTO `timemode` VALUES (1,'TimeIn',3,NULL,'2026-06-10 11:35:15','2026-06-10 11:35:15'),(2,'LunchOut',3,NULL,'2026-06-10 11:35:21','2026-06-10 11:35:21'),(3,'LunchIn',3,NULL,'2026-06-10 11:35:27','2026-06-10 11:35:27'),(4,'TimeOut',3,NULL,'2026-06-10 11:35:37','2026-06-10 11:35:37');
/*!40000 ALTER TABLE `timemode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheet`
--

DROP TABLE IF EXISTS `timesheet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheet` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheet`
--

LOCK TABLES `timesheet` WRITE;
/*!40000 ALTER TABLE `timesheet` DISABLE KEYS */;
INSERT INTO `timesheet` VALUES (1,3,'default_time','df_001','08:00','12:00','13:00','17:00',1,1,1,1,'2026-06-10 08:48:40','2026-06-10 08:48:40');
/*!40000 ALTER TABLE `timesheet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,2,'ieng kimlong','$2b$10$ioQSNDP.gOmGf1m.w4UhWu2iG7Oa/yx5/lFL6cnB25Aq4WSocXpYm',1,2,'2026-06-10 06:02:26','2026-06-10 06:02:26'),(2,3,'kim linna','$2b$10$kNMnduOaNa.BtGE4d44c0e3Tjw2.LqZ31RzZ73Wo1dk5O17fhcuZi',0,1,'2026-06-10 06:07:28','2026-06-10 06:07:28'),(4,5,'em sokhai','$2b$10$rCPZ588.j0rgSiWh6YyAze9ia1oxGoE5AyJMP2sc8xgbGWRC8LDom',0,9,'2026-06-10 08:46:49','2026-06-10 08:46:49'),(5,6,'kim long','$2b$10$BYkPfugf2B8aENcEbHXLnuO1vJYGuvJnVdMGi0b3V9rAd3DmSJvL2',0,8,'2026-06-10 09:01:54','2026-06-10 09:01:54'),(6,7,'bun mark','$2b$10$bzQ3EgdVjrKskOHXWsENleDQjNbU791DMyyR/fRF8k72mqtasv8pa',1,0,'2026-06-16 14:42:41','2026-06-16 14:42:41');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-17 15:31:32
