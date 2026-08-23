import recruitmentRepository from "../repository/recruitment.repository.js";
import { addEmployee, emailCheck } from "./Employee.js";
import { addAuditLog } from "./AuditLog.js";
import prisma from "../lib/prisma.js";

class RecruitmentService {
  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboardStats(companyId) {
    return recruitmentRepository.getRecruitmentDashboardStats(companyId);
  }

  // ==========================================
  // JOB POSTINGS
  // ==========================================
  async getJobPostings(companyId, filters) {
    return recruitmentRepository.getJobPostings(companyId, filters);
  }

  async getJobPostingById(id, companyId) {
    const job = await recruitmentRepository.getJobPostingById(id, companyId);
    if (!job) throw new Error("Job posting not found");
    return job;
  }

  async createJobPosting(data, companyId) {
    return recruitmentRepository.createJobPosting({
      ...data,
      company_id: companyId,
      department_id: parseInt(data.department_id),
      position_id: parseInt(data.position_id),
      salary_min: data.salary_min ? parseFloat(data.salary_min) : null,
      salary_max: data.salary_max ? parseFloat(data.salary_max) : null,
      openings_count: data.openings_count ? parseInt(data.openings_count) : 1,
      posted_date: data.posted_date ? new Date(data.posted_date) : new Date(),
      closing_date: data.closing_date ? new Date(data.closing_date) : null,
    });
  }

  async updateJobPosting(id, companyId, data) {
    const updateData = { ...data };
    if (data.department_id) updateData.department_id = parseInt(data.department_id);
    if (data.position_id) updateData.position_id = parseInt(data.position_id);
    if (data.salary_min !== undefined) updateData.salary_min = data.salary_min ? parseFloat(data.salary_min) : null;
    if (data.salary_max !== undefined) updateData.salary_max = data.salary_max ? parseFloat(data.salary_max) : null;
    if (data.openings_count !== undefined) updateData.openings_count = parseInt(data.openings_count);
    if (data.closing_date) updateData.closing_date = new Date(data.closing_date);

    return recruitmentRepository.updateJobPosting(id, companyId, updateData);
  }

  async deleteJobPosting(id, companyId) {
    const candidateCount = await prisma.candidate.count({
      where: { job_posting_id: parseInt(id), company_id: companyId },
    });
    if (candidateCount > 0) {
      throw new Error(`Cannot delete this job posting because ${candidateCount} candidate(s) have applied to it.`);
    }

    return recruitmentRepository.deleteJobPosting(id, companyId);
  }

  // ==========================================
  // CANDIDATES
  // ==========================================
  async getCandidates(companyId, filters) {
    return recruitmentRepository.getCandidates(companyId, filters);
  }

  async getCandidateById(id, companyId) {
    const candidate = await recruitmentRepository.getCandidateById(id, companyId);
    if (!candidate) throw new Error("Candidate not found");
    return candidate;
  }

  async createCandidate(data, companyId) {
    return recruitmentRepository.createCandidate({
      ...data,
      company_id: companyId,
      job_posting_id: data.job_posting_id ? parseInt(data.job_posting_id) : null,
      rating: data.rating ? parseInt(data.rating) : 0,
      interview_date: data.interview_date ? new Date(data.interview_date) : null,
      offered_salary: data.offered_salary ? parseFloat(data.offered_salary) : null,
    });
  }

  async updateCandidate(id, companyId, data) {
    const candidate = await recruitmentRepository.getCandidateById(id, companyId);
    if (!candidate) throw new Error("Candidate not found");

    if (candidate.hired_employee_id && data.status && data.status !== "HIRED") {
      throw new Error("This candidate has already been converted to an active employee and cannot be moved from the Hired stage.");
    }

    const updateData = { ...data };
    if (updateData.job_posting_id) {
      updateData.job_posting_id = parseInt(updateData.job_posting_id);
    }
    if (updateData.rating) {
      updateData.rating = parseInt(updateData.rating);
    }
    if (updateData.offered_salary) {
      updateData.offered_salary = parseFloat(updateData.offered_salary);
    }

    return recruitmentRepository.updateCandidate(id, companyId, updateData);
  }

  async updateCandidateStage(id, companyId, stage) {
    const validStages = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
    if (!validStages.includes(stage)) {
      throw new Error(`Invalid stage: ${stage}`);
    }

    const candidate = await recruitmentRepository.getCandidateById(id, companyId);
    if (!candidate) throw new Error("Candidate not found");

    if (candidate.hired_employee_id && stage !== "HIRED") {
      throw new Error("This candidate has already been converted to an active employee and cannot be moved from the Hired stage.");
    }

    return recruitmentRepository.updateCandidate(id, companyId, { status: stage });
  }

  async deleteCandidate(id, companyId) {
    return recruitmentRepository.deleteCandidate(id, companyId);
  }

  // ==========================================
  // CONVERT CANDIDATE TO EMPLOYEE (1-Click Hire)
  // ==========================================
  async convertCandidateToEmployee(candidateId, companyId, payload, reqUser, reqMeta = {}) {
    const candidate = await recruitmentRepository.getCandidateById(candidateId, companyId);
    if (!candidate) throw new Error("Candidate not found");

    if (candidate.hired_employee_id) {
      throw new Error("This candidate has already been converted to an employee.");
    }

    const {
      first_name = candidate.first_name,
      last_name = candidate.last_name,
      email = candidate.email,
      phone_number1 = candidate.phone,
      department_id = candidate.jobposting?.department_id,
      position_id = candidate.jobposting?.position_id,
      role_id,
      joined_at = new Date(),
      base_salary = candidate.offered_salary || 600,
      gender = "other",
    } = payload;

    if (!role_id) {
      // Find default or first role for company if not provided
      const defaultRole = await prisma.role.findFirst({
        where: { company_id: companyId },
        orderBy: { id: "asc" },
      });
      if (!defaultRole) throw new Error("Please provide a valid role_id for the new employee.");
    }

    // Check if email already exists
    if (email) {
      const emailExists = await emailCheck(email);
      if (emailExists.result) {
        throw new Error(`An employee with email ${email} already exists.`);
      }
    }

    // Create employee record
    const result = await addEmployee(
      first_name,
      last_name,
      null, // age
      gender,
      phone_number1,
      null, // phone_number2
      email,
      null, // address
      null, // profile_path
      position_id,
      department_id,
      role_id,
      null, // telegram_username
      joined_at,
      companyId,
      "active",
      base_salary
    );

    const newEmployeeId = result.id;

    // Update candidate status to HIRED and link hired_employee_id
    await recruitmentRepository.updateCandidate(candidateId, companyId, {
      status: "HIRED",
      hired_employee_id: newEmployeeId,
      offered_salary: base_salary ? parseFloat(base_salary) : candidate.offered_salary,
    });

    // Add Audit Log
    try {
      await addAuditLog(
        reqUser.id,
        companyId,
        "Recruitment",
        "CONVERT_TO_EMPLOYEE",
        `Converted candidate ${first_name} ${last_name} to employee ID: ${newEmployeeId}`,
        null,
        reqMeta.ip,
        reqMeta.userAgent
      );
    } catch (e) {
      console.error("[Recruitment AuditLog Error]", e.message);
    }

    return {
      result: true,
      message: `Candidate ${first_name} ${last_name} successfully converted to employee!`,
      employee_id: newEmployeeId,
    };
  }

  // ==========================================
  // PUBLIC CAREERS API (No auth required)
  // ==========================================
  async getPublicJobPosting(id) {
    const job = await prisma.jobposting.findFirst({
      where: { id: parseInt(id), status: "OPEN" },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        company: {
          select: {
            id: true,
            name: true,
            logo_path: true,
            primary_color: true,
            secondary_color: true,
          },
        },
      },
    });

    if (!job) {
      throw new Error("Job posting not found or is no longer accepting applications.");
    }

    return job;
  }

  async publicApplyCandidate(data) {
    const { job_posting_id, first_name, last_name, email, phone, resume_url, cover_letter, offered_salary } = data;

    if (!job_posting_id) throw new Error("Job posting ID is required.");
    if (!first_name || !last_name) throw new Error("Full name is required.");
    if (!email) throw new Error("Email address is required.");

    const job = await prisma.jobposting.findFirst({
      where: { id: parseInt(job_posting_id), status: "OPEN" },
    });

    if (!job) {
      throw new Error("Job posting is no longer active.");
    }

    const candidate = await prisma.candidate.create({
      data: {
        company_id: job.company_id,
        job_posting_id: job.id,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone ? phone.trim() : null,
        resume_url: resume_url || null,
        cover_letter: cover_letter || null,
        offered_salary: offered_salary ? parseFloat(offered_salary) : null,
        status: "APPLIED",
        rating: 3,
      },
      include: {
        jobposting: {
          select: { title: true },
        },
      },
    });

    // Notify company admins / HR
    try {
      const { notifyAdmins } = await import("./Notification.js");
      await notifyAdmins(
        job.company_id,
        "New Job Applicant",
        `${first_name} ${last_name} applied for ${job.title}`,
        candidate.id
      );
    } catch (e) {
      console.error("[Recruitment Notification Error]", e.message);
    }

    return {
      result: true,
      message: "Application submitted successfully! Our HR team will review your application soon.",
      candidate_id: candidate.id,
    };
  }
}

export default new RecruitmentService();

