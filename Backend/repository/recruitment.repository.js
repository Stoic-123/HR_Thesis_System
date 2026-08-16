import prisma from "../lib/prisma.js";

class RecruitmentRepository {
  // ==========================================
  // JOB POSTINGS
  // ==========================================
  async getJobPostings(companyId, filters = {}) {
    const where = { company_id: companyId };
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.department_id) {
      where.department_id = parseInt(filters.department_id);
    }

    return prisma.jobposting.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        _count: {
          select: { candidate: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getJobPostingById(id, companyId) {
    return prisma.jobposting.findFirst({
      where: { id: parseInt(id), company_id: companyId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        candidate: {
          orderBy: { created_at: "desc" },
        },
      },
    });
  }

  async createJobPosting(data) {
    return prisma.jobposting.create({
      data,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
    });
  }

  async updateJobPosting(id, companyId, data) {
    return prisma.jobposting.updateMany({
      where: { id: parseInt(id), company_id: companyId },
      data,
    });
  }

  async deleteJobPosting(id, companyId) {
    return prisma.jobposting.deleteMany({
      where: { id: parseInt(id), company_id: companyId },
    });
  }

  // ==========================================
  // CANDIDATES
  // ==========================================
  async getCandidates(companyId, filters = {}) {
    const where = { company_id: companyId };
    if (filters.job_posting_id) {
      where.job_posting_id = parseInt(filters.job_posting_id);
    }
    if (filters.status && filters.status !== "ALL") {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { first_name: { contains: filters.search } },
        { last_name: { contains: filters.search } },
        { email: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ];
    }

    return prisma.candidate.findMany({
      where,
      include: {
        jobposting: {
          select: {
            id: true,
            title: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
        hired_employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getCandidateById(id, companyId) {
    return prisma.candidate.findFirst({
      where: { id: parseInt(id), company_id: companyId },
      include: {
        jobposting: {
          include: {
            department: true,
            position: true,
          },
        },
        hired_employee: true,
      },
    });
  }

  async createCandidate(data) {
    return prisma.candidate.create({
      data,
      include: {
        jobposting: {
          select: {
            id: true,
            title: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async updateCandidate(id, companyId, data) {
    return prisma.candidate.updateMany({
      where: { id: parseInt(id), company_id: companyId },
      data,
    });
  }

  async deleteCandidate(id, companyId) {
    return prisma.candidate.deleteMany({
      where: { id: parseInt(id), company_id: companyId },
    });
  }

  async getRecruitmentDashboardStats(companyId) {
    const [totalJobs, openJobs, totalCandidates, hiredCandidates] = await Promise.all([
      prisma.jobposting.count({ where: { company_id: companyId } }),
      prisma.jobposting.count({ where: { company_id: companyId, status: "OPEN" } }),
      prisma.candidate.count({ where: { company_id: companyId } }),
      prisma.candidate.count({ where: { company_id: companyId, status: "HIRED" } }),
    ]);

    const candidatesByStage = await prisma.candidate.groupBy({
      by: ["status"],
      where: { company_id: companyId },
      _count: { id: true },
    });

    const stageMap = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      HIRED: 0,
      REJECTED: 0,
    };

    candidatesByStage.forEach((group) => {
      if (stageMap[group.status] !== undefined) {
        stageMap[group.status] = group._count.id;
      }
    });

    return {
      totalJobs,
      openJobs,
      totalCandidates,
      hiredCandidates,
      stageMap,
    };
  }
}

export default new RecruitmentRepository();
