import kpiRepository from '../repository/kpi.repository.js';
import prisma from '../lib/prisma.js';
import { createNotification, notifyAdmins } from "./Notification.js";

class KpiService {
  async createCycle(data, company_id) {
    return kpiRepository.createCycle({ ...data, company_id });
  }

  async getCycles(company_id) {
    return kpiRepository.getCycles(company_id);
  }

  async createTemplate(data, company_id) {
    return kpiRepository.createTemplate({ ...data, company_id });
  }

  async addTemplateGoal(template_id, data) {
    return kpiRepository.addTemplateGoal({ ...data, template_id: parseInt(template_id) });
  }

  async getTemplates(company_id) {
    return kpiRepository.getTemplates(company_id);
  }

  async assignTemplateToDepartment(template_id, department_id, cycle_id, company_id) {
    const template = await kpiRepository.getTemplateWithGoals(template_id);
    if (!template) throw new Error('Template not found');

    let employees;
    if (department_id === 'all') {
      employees = await prisma.employee.findMany({ where: { company_id, is_active: 'active' } });
    } else {
      employees = await kpiRepository.getDepartmentEmployees(parseInt(department_id));
    }
    
    if (!employees || employees.length === 0) return { message: 'No active employees to assign' };

    let createdCount = 0;
    let skippedCount = 0;
    
    for (const emp of employees) {
      // Create employee KPI
      try {
        const empKpi = await prisma.employeekpi.create({
          data: {
            employee_id: emp.id,
            cycle_id: parseInt(cycle_id),
            status: 'active'
          }
        });

        // Send notification
        try {
          const empUser = await prisma.user.findFirst({ where: { employee_id: emp.id } });
          if (empUser) {
            await createNotification(company_id, "KPI Cycle Assigned", "A new KPI cycle has been assigned to you.", empUser.id, empKpi.id);
          }
        } catch (e) {
          console.error("[KPI Assign Notification Error]", e.message);
        }

        // Attach goals
        if (template.kpitemplategoal && template.kpitemplategoal.length > 0) {
          const goalsData = template.kpitemplategoal.map(tg => ({
            employee_kpi_id: empKpi.id,
            category: tg.category,
            title: tg.title,
            target_value: tg.target_value,
            target_unit: tg.target_unit,
            weight: tg.weight,
            current_progress: 0
          }));

          await prisma.kpigoal.createMany({ data: goalsData });
        }
        createdCount++;
      } catch (err) {
        // likely unique constraint failure if already assigned
        console.error(`Failed to assign for employee ${emp.id}`, err);
        skippedCount++;
      }
    }

    let message = `Assigned template to ${createdCount} new employees.`;
    if (skippedCount > 0) {
      message += ` (${skippedCount} employees were already assigned to this cycle).`;
    }
    return { message };
  }

  async getTeamDashboard(employee_id, cycle_id) {
    // Determine if employee is a manager
    const department = await kpiRepository.getManagedDepartment(employee_id);
    if (!department) {
      throw new Error('Unauthorized: You are not a department manager');
    }

    const teamMembers = await kpiRepository.getTeamMembers(department.id, parseInt(cycle_id));
    return {
      department: department.name,
      members: teamMembers.filter(m => m.id !== employee_id)
    };
  }

  async submitQuarterlyReview(reviewer_id, reviewData) {
    // Verify reviewer is manager of the employee's department
    const targetEmployeeKpi = await prisma.employeekpi.findUnique({
      where: { id: parseInt(reviewData.employee_kpi_id) },
      include: { employee: true }
    });

    if (!targetEmployeeKpi) throw new Error('Employee KPI not found');

    const department = await kpiRepository.getManagedDepartment(reviewer_id);
    if (!department || department.id !== targetEmployeeKpi.employee.department_id) {
      throw new Error('Unauthorized: You do not manage this employee');
    }

    // Process review
    const data = {
      employee_kpi_id: targetEmployeeKpi.id,
      reviewer_id: reviewer_id,
      quarter: reviewData.quarter,
      overall_manager_comment: reviewData.overall_manager_comment
    };

    const review = await kpiRepository.createQuarterlyReview(data, reviewData.goalsProgress);

    // Notify employee
    try {
      const empUser = await prisma.user.findFirst({ where: { employee_id: targetEmployeeKpi.employee_id } });
      if (empUser) {
        await createNotification(targetEmployeeKpi.employee.company_id, "KPI Quarterly Review Submitted", `Your manager has submitted your Q${reviewData.quarter} review.`, empUser.id, targetEmployeeKpi.id);
      }
    } catch (e) {
      console.error("[KPI Quarterly Review Notification Error]", e.message);
    }

    return review;
  }

  async getMyDashboard(employee_id, cycle_id) {
    if (!employee_id) return null;
    
    const kpi = await kpiRepository.getEmployeeKpi(employee_id, parseInt(cycle_id));
    if (!kpi) return null;

    // Check if employee is also a manager to flag UI
    const managedDept = await kpiRepository.getManagedDepartment(employee_id);
    
    return {
      kpi,
      is_manager: !!managedDept,
      managed_department_id: managedDept ? managedDept.id : null
    };
  }
  async submitManagerScore(manager_id, data) {
    const { employee_kpi_id, scores } = data;
    // verify manager manages this employee
    const targetKpi = await kpiRepository.getEmployeeKpiById(employee_kpi_id);
    if (!targetKpi) throw new Error('KPI not found');
    const dept = await kpiRepository.getManagedDepartment(manager_id);
    if (!dept || dept.id !== targetKpi.employee.department_id) {
      throw new Error('Unauthorized');
    }

    return prisma.$transaction(async (tx) => {
      for (const score of scores) {
        await tx.kpigoal.update({
          where: { id: score.goal_id },
          data: { manager_score: score.score }
        });
      }
      await tx.employeekpi.update({
        where: { id: employee_kpi_id },
        data: { evaluation_status: 'pending_hr' }
      });

      // Notify admins
      try {
        const empName = `${targetKpi.employee.first_name} ${targetKpi.employee.last_name}`;
        await notifyAdmins(dept.company_id, "KPI Manager Score Submitted", `KPI manager evaluation for ${empName} is pending HR review.`, employee_kpi_id);
      } catch (e) {
        console.error("[KPI Manager Score Notification Error]", e.message);
      }
      return { success: true };
    });
  }

  async submitHrScore(company_id, data) {
    const { employee_kpi_id, scores } = data;
    // ideally check if employee is in the same company
    return prisma.$transaction(async (tx) => {
      let totalWeight = 0;
      let totalScore = 0;
      
      for (const score of scores) {
        const goal = await tx.kpigoal.update({
          where: { id: score.goal_id },
          data: { hr_score: score.score, current_progress: score.score } // optionally set current_progress too
        });
        const w = parseFloat(goal.weight) || 0;
        let p = 0;
        if (goal.target_value > 0) {
          p = Math.min((score.score / goal.target_value) * 100, 100);
        }
        totalScore += (p * w) / 100;
        totalWeight += w;
      }
      
      const overall = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
      
      await tx.employeekpi.update({
        where: { id: employee_kpi_id },
        data: { evaluation_status: 'completed', total_score: overall }
      });

      // Notify employee
      try {
        const empUser = await prisma.user.findFirst({ where: { employee_id: targetKpi.employee_id } });
        if (empUser) {
          await createNotification(company_id, "KPI Evaluation Finalized", `Your KPI evaluation is complete. Total score: ${overall}%.`, empUser.id, employee_kpi_id);
        }
      } catch (e) {
        console.error("[KPI HR Score Notification Error]", e.message);
      }
      return { success: true, total_score: overall };
    });
  }

  async getEvaluations(cycle_id) {
    const kpis = await prisma.employeekpi.findMany({
      where: { cycle_id: parseInt(cycle_id) },
      include: {
        employee: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            department_employee_department_idTodepartment: true,
          }
        },
        kpigoal: true
      }
    });

    const filteredKpis = kpis.filter(kpi => {
      const dept = kpi.employee.department_employee_department_idTodepartment;
      if (dept && dept.manager_id === kpi.employee.id) {
        return false; // Exclude department manager from the evaluation queue
      }
      return true;
    });

    return filteredKpis.map(kpi => ({
      ...kpi,
      employee: {
        ...kpi.employee,
        department: kpi.employee.department_employee_department_idTodepartment,
        department_employee_department_idTodepartment: undefined
      }
    }));
  }
}

export default new KpiService();
