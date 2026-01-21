-- =====================================================
-- Complete HRMS Database Schema - ENHANCED VERSION
-- For MySQL 5.7+ / MariaDB 10.2+
-- With Family & Personal Information
-- =====================================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS AuditLog;
DROP TABLE IF EXISTS overtime;
DROP TABLE IF EXISTS Notification;
DROP TABLE IF EXISTS Announcement;
DROP TABLE IF EXISTS EmployeeLocation;
DROP TABLE IF EXISTS RoleBaseAccess;
DROP TABLE IF EXISTS Document;
DROP TABLE IF EXISTS DocumentType;
DROP TABLE IF EXISTS LeaveRecord;
DROP TABLE IF EXISTS AttendanceRecord;
DROP TABLE IF EXISTS LeaveProfile;
DROP TABLE IF EXISTS LeaveType;
DROP TABLE IF EXISTS User;
DROP TABLE IF EXISTS Employee;
DROP TABLE IF EXISTS Positions;
DROP TABLE IF EXISTS Department;
DROP TABLE IF EXISTS Role;
DROP TABLE IF EXISTS TimeMode;
DROP TABLE IF EXISTS Location;
DROP TABLE IF EXISTS Holiday;
DROP TABLE IF EXISTS Company;

-- =====================================================
-- Core System Tables
-- =====================================================

-- Company Table (Must be created first)
CREATE TABLE Company (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    primary_color VARCHAR(50),
    secondary_color VARCHAR(50),
    logo_path VARCHAR(500),
    telegram_group_id VARCHAR(255),
    telegram_bot_token VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Holiday Table
CREATE TABLE Holiday (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    company_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_holiday_dates (start_date, end_date),
    INDEX idx_holiday_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Location Table
CREATE TABLE Location (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    longitude VARCHAR(255),
    latitude VARCHAR(255),
    radius INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_location_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TimeMode Table
CREATE TABLE TimeMode (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    remark VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_timemode_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role Table
CREATE TABLE Role (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    company_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_role_company (company_id),
    UNIQUE KEY unique_role_company (name, company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Department Table
CREATE TABLE Department (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    manager_id INT,
    company_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_department_manager (manager_id),
    INDEX idx_department_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Positions Table
CREATE TABLE Positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    department_id INT,
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_position_department (department_id),
    CONSTRAINT fk_position_department FOREIGN KEY (department_id) 
        REFERENCES Department(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Employee & User Tables (ENHANCED)
-- =====================================================

-- Employee Table (Enhanced with Family Information)
CREATE TABLE Employee (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Basic Information
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    age INT,
    gender ENUM('male', 'female', 'other') DEFAULT 'other',
    phone_number1 VARCHAR(50),
    phone_number2 VARCHAR(50),
    email VARCHAR(255),
    address VARCHAR(500),
    profile_path VARCHAR(500),
    
    -- Work Information
    position_id INT,
    department_id INT,
    role_id INT,
    location_id INT,
    telegram_username VARCHAR(255),
    joined_at DATETIME,
    company_id INT NOT NULL,
    is_active ENUM('active', 'inactive') DEFAULT 'active',
    
    -- Family Information - Partner/Spouse
    relationship_status ENUM('single', 'married', 'divorced', 'widowed', 'other') DEFAULT 'single',
    partner_name VARCHAR(255),
    partner_age INT,
    partner_occupation VARCHAR(255),
    
    -- Family Information - Children
    total_children INT DEFAULT 0,
    total_daughters INT DEFAULT 0,
    total_sons INT DEFAULT 0,
    
    -- Family Information - Siblings
    female_sibling INT DEFAULT 0,
    total_sibling INT DEFAULT 0,
    
    -- Family Information - Parents
    father_name VARCHAR(255),
    father_age INT,
    father_occupation VARCHAR(255),
    father_life_status ENUM('alive', 'deceased') DEFAULT 'alive',
    
    mother_name VARCHAR(255),
    mother_age INT,
    mother_occupation VARCHAR(255),
    mother_life_status ENUM('alive', 'deceased') DEFAULT 'alive',
    
    -- Emergency Contact / Guardian
    guardian_name VARCHAR(255),
    guardian_phone_number VARCHAR(50),
    guardian_relationship VARCHAR(100),
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (position_id) REFERENCES Positions(id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES Department(id) ON DELETE SET NULL,
    FOREIGN KEY (role_id) REFERENCES Role(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES Location(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_employee_company (company_id),
    INDEX idx_employee_department (department_id),
    INDEX idx_employee_position (position_id),
    INDEX idx_employee_location (location_id),
    INDEX idx_employee_active (is_active),
    INDEX idx_employee_name (first_name, last_name),
    INDEX idx_employee_relationship (relationship_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Table
CREATE TABLE User (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
    leave_type_id INT NOT NULL,
    assignment INT DEFAULT 0,
    used INT DEFAULT 0,
    balance INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES LeaveType(id) ON DELETE CASCADE,
    INDEX idx_leaveprofile_employee (employee_id),
    INDEX idx_leaveprofile_leavetype (leave_type_id),
    UNIQUE KEY unique_employee_leavetype (employee_id, leave_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- LeaveRecord Table
CREATE TABLE LeaveRecord (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    request_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (leave_type_id) REFERENCES LeaveType(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Employee(id) ON DELETE SET NULL,
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
    time_mode_id INT NOT NULL,
    status ENUM('present', 'absent', 'late', 'half_day') NOT NULL,
    work_at DATETIME NOT NULL,
    is_late BOOLEAN DEFAULT FALSE,
    is_early BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (time_mode_id) REFERENCES TimeMode(id) ON DELETE CASCADE,
    INDEX idx_attendance_employee (employee_id),
    INDEX idx_attendance_timemode (time_mode_id),
    INDEX idx_attendance_status (status),
    INDEX idx_attendance_work_at (work_at)
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
    document_type_id INT NOT NULL,
    document_path VARCHAR(500) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (document_type_id) REFERENCES DocumentType(id) ON DELETE CASCADE,
    INDEX idx_document_employee (employee_id),
    INDEX idx_document_type (document_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Access Control Table
-- =====================================================

-- RoleBaseAccess Table
CREATE TABLE RoleBaseAccess (
    id INT PRIMARY KEY AUTO_INCREMENT,
    path_name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL,
    role_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Role(id) ON DELETE CASCADE,
    INDEX idx_roleaccess_role (role_id),
    INDEX idx_roleaccess_path (path(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Location Tracking Table
-- =====================================================

-- EmployeeLocation Table (Junction Table)
CREATE TABLE EmployeeLocation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    location_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES Location(id) ON DELETE CASCADE,
    INDEX idx_employeelocation_employee (employee_id),
    INDEX idx_employeelocation_location (location_id),
    UNIQUE KEY unique_employee_location (employee_id, location_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Communication Tables
-- =====================================================

-- Announcement Table
CREATE TABLE Announcement (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    announcement TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_announcement_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Table
CREATE TABLE Notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    to_user_id INT,
    reference_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES User(id) ON DELETE CASCADE,
    INDEX idx_notification_company (company_id),
    INDEX idx_notification_user (to_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Overtime Table
-- =====================================================

-- overtime Table
CREATE TABLE overtime (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employee(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Employee(id) ON DELETE SET NULL,
    INDEX idx_overtime_employee (employee_id),
    INDEX idx_overtime_status (status),
    INDEX idx_overtime_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Audit Log Table
-- =====================================================

-- AuditLog Table
CREATE TABLE AuditLog (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    company_id INT NOT NULL,
    module VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE CASCADE,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_company (company_id),
    INDEX idx_audit_module (module),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- Add Department Manager FK (Circular Reference)
-- =====================================================

ALTER TABLE Department
ADD CONSTRAINT fk_department_manager 
FOREIGN KEY (manager_id) REFERENCES Employee(id) ON DELETE SET NULL;

-- =====================================================
-- End of Enhanced Schema
-- =====================================================