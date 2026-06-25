import prisma from '../lib/prisma.js';

class KpiRepository {
  // ======================
  // ADMIN & CYCLES
  // ======================
  async createCycle(data) {
    return prisma.kpicycle.create({ data });
  }

  async getCycles(company_id) {
    return prisma.kpicycle.findMany({
      where: { company_id },
      orderBy: { start_date: 'desc' }
    });
  }

  async updateCycle(id, data) {
    return prisma.kpicycle.update({
      where: { id: parseInt(id) },
      data
    });
  }

  // ======================
  // TEMPLATES
  // ======================
  async createTemplate(data) {
    return prisma.kpitemplate.create({ data });
  }

  async getTemplates(company_id) {
    return prisma.kpitemplate.findMany({
      where: { company_id },
      include: { kpitemplategoal: true }
    });
  }

  async addTemplateGoal(data) {
    return prisma.kpitemplategoal.create({ data });
  }

  async getTemplateWithGoals(template_id) {
    return prisma.kpitemplate.findUnique({
      where: { id: parseInt(template_id) },
      include: { kpitemplategoal: true }
    });
  }

  // ======================
  // EMPLOYEE KPI & GOALS
  // ======================
  async createEmployeeKpi(data) {
    return prisma.employeekpi.create({ data });
  }

  async getEmployeeKpi(employee_id, cycle_id) {
    return prisma.employeekpi.findUnique({
      where: { employee_id_cycle_id: { employee_id, cycle_id } },
      include: { kpigoal: true, kpireview: { include: { kpigoalprogress: true } } }
    });
  }

  async getEmployeeKpiById(id) {
    return prisma.employeekpi.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true, kpigoal: true }
    });
  }

  async createKpiGoal(data) {
    return prisma.kpigoal.create({ data });
  }

  async getDepartmentEmployees(department_id) {
    return prisma.employee.findMany({
      where: { department_id, is_active: 'active' }
    });
  }

  // ======================
  // MANAGERS & REVIEWS
  // ======================
  async getManagedDepartment(manager_id) {
    return prisma.department.findFirst({
      where: { manager_id }
    });
  }

  async getTeamMembers(department_id, cycle_id) {
    return prisma.employee.findMany({
      where: { department_id, is_active: 'active' },
      include: {
        employeekpi: {
          where: { cycle_id },
          include: { kpigoal: true }
        }
      }
    });
  }

  async createQuarterlyReview(data, goalsProgress) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.kpireview.create({
        data: {
          employee_kpi_id: data.employee_kpi_id,
          reviewer_id: data.reviewer_id,
          quarter: data.quarter,
          overall_manager_comment: data.overall_manager_comment,
          status: 'completed',
          review_date: new Date()
        }
      });

      if (goalsProgress && goalsProgress.length > 0) {
        const progressData = goalsProgress.map(p => ({
          review_id: review.id,
          kpi_goal_id: p.kpi_goal_id,
          progress_percentage: p.progress_percentage,
          manager_comment: p.manager_comment
        }));

        await tx.kpigoalprogress.createMany({
          data: progressData
        });

        // Update the current progress in kpigoal
        for (const p of goalsProgress) {
          await tx.kpigoal.update({
            where: { id: p.kpi_goal_id },
            data: { current_progress: p.progress_percentage }
          });
        }
      }

      return review;
    });
  }
}

export default new KpiRepository();
