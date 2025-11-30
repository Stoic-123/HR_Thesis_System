-- =====================================================
-- Complete HRMS Database Schema
-- For MySQL 5.7+ / MariaDB 10.2+
-- All IDs using INT for consistency
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS RoleBaseAccess;
DROP TABLE IF EXISTS Document;
DROP TABLE IF EXISTS LeaveRecord;
DROP TABLE IF EXISTS AttendanceRecord;
DROP TABLE IF EXISTS LeaveProfile;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Position;
DROP TABLE IF EXISTS Department;
DROP TABLE IF EXISTS Role;
DROP TABLE IF EXISTS DocumentType;
DROP TABLE IF EXISTS LeaveType;
DROP TABLE IF EXISTS TimeMode;
DROP TABLE IF EXISTS Company;
DROP TABLE IF EXISTS Holiday;

-- =====================================================
-- Core Tables
-- =====================================================

-- Holiday Table
CREATE TABLE Holiday (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_holiday_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company Table
CREATE TABLE Company (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    logo_path VARCHAR(500),
    telegram_group_id VARCHAR(255),
    telegram_bot_token VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TimeMode Table
CREATE TABLE TimeMode (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name INT NOT NULL,
    company_id INT NOT NULL,
    created_at INT NOT NULL,
    updated_at INT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_timemode_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Table
CREATE TABLE Role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    created_at INT NOT NULL,
    updated_at INT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_role_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Department Table (without manager_id FK - will add later)
CREATE TABLE Department (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    manager_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_department_manager (manager_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Position Table
CREATE TABLE `Position` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    department_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_position_department (department_id),
    CONSTRAINT fk_position_department FOREIGN KEY (department_id) REFERENCES Department(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Employee & User Tables
-- =====================================================

-- Employee Table
CREATE TABLE Employee (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    age INT,
    gender VARCHAR(50),
    phone_number1 INT,
    phone_number2 INT,
    address VARCHAR(500),
    profile_path VARCHAR(500),
    position INT,
    department INT,
    role_id INT,
    telegram_username VARCHAR(255),
    joined_at DATETIME,
    company_id INT NOT NULL,
    is_active ENUM('active', 'inactive') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_company (company_id),
    INDEX idx_employee_department (department),
    INDEX idx_employee_position (position),
    INDEX idx_employee_active (is_active),
    INDEX idx_employee_name (first_name, last_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Table
CREATE TABLE User (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    INDEX idx_user_username (username),
    INDEX idx_user_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Leave Management Tables
-- =====================================================

-- LeaveType Table
CREATE TABLE LeaveType (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_leavetype_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LeaveProfile Table
CREATE TABLE LeaveProfile (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    assignment INT,
    used INT DEFAULT 0,
    balance INT NOT NULL,
    leave_type INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type) REFERENCES LeaveType(id) ON DELETE CASCADE,
    INDEX idx_leaveprofile_employee (employee_id),
    INDEX idx_leaveprofile_leavetype (leave_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LeaveRecord Table
CREATE TABLE LeaveRecord (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    reason VARCHAR(1000),
    status BOOLEAN DEFAULT FALSE,
    leave_type INT NOT NULL,
    approved_by INT,
    request_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type) REFERENCES LeaveType(id) ON DELETE CASCADE,
    INDEX idx_leaverecord_employee (employee_id),
    INDEX idx_leaverecord_dates (start_date, end_date),
    INDEX idx_leaverecord_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Attendance Table
-- =====================================================

-- AttendanceRecord Table
CREATE TABLE AttendanceRecord (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    time_mode INT NOT NULL,
    status ENUM('present', 'absent', 'late', 'half_day') NOT NULL,
    created_at INT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (time_mode) REFERENCES TimeMode(id) ON DELETE CASCADE,
    INDEX idx_attendance_employee (employee_id),
    INDEX idx_attendance_timemode (time_mode),
    INDEX idx_attendance_status (status),
    INDEX idx_attendance_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Document Management Tables
-- =====================================================

-- DocumentType Table
CREATE TABLE DocumentType (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_doctype_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document Table
CREATE TABLE Document (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    document_type INT NOT NULL,
    document_path VARCHAR(500) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (document_type) REFERENCES DocumentType(id) ON DELETE CASCADE,
    INDEX idx_document_employee (employee_id),
    INDEX idx_document_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Access Control Table
-- =====================================================

-- RoleBaseAccess Table
CREATE TABLE RoleBaseAccess (
    id INT PRIMARY KEY AUTO_INCREMENT,
    path_name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    role INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role) REFERENCES Role(id) ON DELETE CASCADE,
    INDEX idx_roleaccess_role (role),
    INDEX idx_roleaccess_path (path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Add ALL Foreign Keys (After All Tables Exist)
-- =====================================================

-- Employee foreign keys
ALTER TABLE Employee
ADD CONSTRAINT fk_employee_company 
FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE;

ALTER TABLE Employee
ADD CONSTRAINT fk_employee_position 
FOREIGN KEY (`position`) REFERENCES `Position`(`id`) ON DELETE SET NULL;


ALTER TABLE Employee
ADD CONSTRAINT fk_employee_department 
FOREIGN KEY (department) REFERENCES Department(id) ON DELETE SET NULL;

ALTER TABLE Employee
ADD CONSTRAINT fk_employee_role 
FOREIGN KEY (role_id) REFERENCES Role(id) ON DELETE SET NULL;

-- Department manager foreign key (circular reference)
ALTER TABLE Department
ADD CONSTRAINT fk_department_manager 
FOREIGN KEY (manager_id) REFERENCES Employee(id) ON DELETE SET NULL;


-- Modify add 2 columns to table user

ALTER TABLE `user`
ADD `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- =====================================================
-- End of Schema
-- =====================================================

