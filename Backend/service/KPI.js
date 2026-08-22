import prisma from "../lib/prisma.js";
import { sendTelegramMessage } from "./Telegram.js";

const RATING_SCORE_MAP = {
  good: 3.0,
  average: 2.0,
  needs_improvement: 1.0,
};

export const calculateGradeAndScore = (discipline, output, attitude) => {
  const dScore = RATING_SCORE_MAP[discipline] || 3.0;
  const oScore = RATING_SCORE_MAP[output] || 3.0;
  const aScore = RATING_SCORE_MAP[attitude] || 3.0;

  const totalScore = Number(((dScore + oScore + aScore) / 3).toFixed(2));

  let overallGrade = "AVERAGE";
  if (totalScore >= 2.5) {
    overallGrade = "GOOD";
  } else if (totalScore < 1.7) {
    overallGrade = "NEEDS_IMPROVEMENT";
  }

  return { totalScore, overallGrade };
};

/**
 * 1. Get an employee's personal KPI history (Employee View)
 */
export const getEmployeeKPIHistory = async (employeeId, year = new Date().getFullYear()) => {
  const evaluations = await prisma.kpievaluation.findMany({
    where: {
      employee_id: Number(employeeId),
      year: Number(year),
    },
    include: {
      evaluator: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          profile_path: true,
        },
      },
    },
    orderBy: {
      month: "asc",
    },
  });

  // Calculate year-to-date average
  let totalScoreSum = 0;
  let count = evaluations.length;

  evaluations.forEach((item) => {
    totalScoreSum += Number(item.total_score);
  });

  const yearlyAverageScore = count > 0 ? Number((totalScoreSum / count).toFixed(2)) : 0;
  let yearlyGrade = "NONE";
  if (count > 0) {
    if (yearlyAverageScore >= 2.5) yearlyGrade = "GOOD";
    else if (yearlyAverageScore >= 1.7) yearlyGrade = "AVERAGE";
    else yearlyGrade = "NEEDS_IMPROVEMENT";
  }

  return {
    evaluations,
    summary: {
      totalEvaluatedMonths: count,
      yearlyAverageScore,
      yearlyGrade,
    },
  };
};

/**
 * 2. Get Team KPI Evaluations for Manager (Manager View)
 * Managers see direct department subordinates and their evaluation status for month/year.
 */
export const getTeamKPIEvaluations = async (managerEmployeeId, companyId, month, year) => {
  const currentMonth = Number(month) || new Date().getMonth() + 1;
  const currentYear = Number(year) || new Date().getFullYear();

  // Find departments managed by this employee
  const managedDepts = await prisma.department.findMany({
    where: {
      company_id: Number(companyId),
      manager_id: Number(managerEmployeeId),
    },
    select: { id: true, name: true },
  });

  let deptIds = managedDepts.map((d) => d.id);
  let isManager = deptIds.length > 0;

  // If the user isn't assigned as manager_id in any department, check if they are Admin/HR
  if (deptIds.length === 0) {
    const emp = await prisma.employee.findUnique({
      where: { id: Number(managerEmployeeId) },
      include: { role: true },
    });
    const roleName = emp?.role?.name?.toLowerCase() || "";
    if (roleName.includes("admin") || roleName.includes("hr")) {
      isManager = true;
      // Admins/HR can see all departments
      const allDepts = await prisma.department.findMany({
        where: { company_id: Number(companyId) },
        select: { id: true, name: true },
      });
      deptIds = allDepts.map((d) => d.id);
    }
  }

  // If regular employee (not manager and not admin/HR), return empty list and isManager: false
  if (deptIds.length === 0) {
    return {
      month: currentMonth,
      year: currentYear,
      isManager: false,
      totalSubordinates: 0,
      completedCount: 0,
      pendingCount: 0,
      team: [],
    };
  }

  // Get active subordinates in these departments (excluding the manager themselves)
  const subordinates = await prisma.employee.findMany({
    where: {
      company_id: Number(companyId),
      department_id: { in: deptIds },
      is_active: "active",
      id: { not: Number(managerEmployeeId) },
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      profile_path: true,
      department_id: true,
      position_id: true,
      department_employee_department_idTodepartment: {
        select: { id: true, name: true },
      },
      positions: {
        select: { id: true, name: true },
      },
    },
    orderBy: { first_name: "asc" },
  });

  const subIds = subordinates.map((s) => s.id);

  // Fetch evaluations already completed for this month
  const existingEvaluations = await prisma.kpievaluation.findMany({
    where: {
      company_id: Number(companyId),
      employee_id: { in: subIds },
      month: currentMonth,
      year: currentYear,
    },
  });

  const evalMap = new Map();
  existingEvaluations.forEach((e) => evalMap.set(e.employee_id, e));

  const teamList = subordinates.map((sub) => {
    const evalRecord = evalMap.get(sub.id) || null;
    return {
      employee: sub,
      evaluation: evalRecord,
      isEvaluated: !!evalRecord,
    };
  });

  const completedCount = teamList.filter((t) => t.isEvaluated).length;
  const pendingCount = teamList.length - completedCount;

  return {
    month: currentMonth,
    year: currentYear,
    isManager: true,
    totalSubordinates: teamList.length,
    completedCount,
    pendingCount,
    team: teamList,
  };
};

/**
 * 3. Submit or Update an Employee's Monthly KPI Evaluation
 */
export const submitKPIEvaluation = async ({
  companyId,
  evaluatorId,
  employeeId,
  month,
  year,
  disciplineRating = "good",
  outputRating = "good",
  attitudeRating = "good",
  managerComment = "",
  templateId = null,
}) => {
  const m = Number(month);
  const y = Number(year);
  const empId = Number(employeeId);
  const evalId = Number(evaluatorId);
  const compId = Number(companyId);

  const { totalScore, overallGrade } = calculateGradeAndScore(
    disciplineRating,
    outputRating,
    attitudeRating
  );

  const evaluation = await prisma.kpievaluation.upsert({
    where: {
      employee_id_month_year: {
        employee_id: empId,
        month: m,
        year: y,
      },
    },
    create: {
      company_id: compId,
      evaluator_id: evalId,
      employee_id: empId,
      month: m,
      year: y,
      template_id: templateId ? Number(templateId) : null,
      discipline_rating: disciplineRating,
      output_rating: outputRating,
      attitude_rating: attitudeRating,
      total_score: totalScore,
      overall_grade: overallGrade,
      manager_comment: managerComment || null,
      status: "submitted",
    },
    update: {
      evaluator_id: evalId,
      template_id: templateId ? Number(templateId) : null,
      discipline_rating: disciplineRating,
      output_rating: outputRating,
      attitude_rating: attitudeRating,
      total_score: totalScore,
      overall_grade: overallGrade,
      manager_comment: managerComment || null,
      status: "submitted",
    },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
      evaluator: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    },
  });

  // Create in-app notification for the employee
  try {
    const userAccount = await prisma.user.findFirst({
      where: { employee_id: empId },
    });
    if (userAccount) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthLabel = monthNames[m - 1] || `Month ${m}`;

      await prisma.notification.create({
        data: {
          company_id: compId,
          to_user_id: userAccount.id,
          title: `KPI Evaluation Ready (${monthLabel} ${y})`,
          body: `Your manager has submitted your performance review. Grade: ${overallGrade}`,
          reference_id: evaluation.id,
        },
      });
    }
  } catch (err) {
    console.error("[KPI] Notification error:", err.message);
  }

  return evaluation;
};

/**
 * 4. Company-Wide KPI Overview (HR & Admin Report)
 */
export const getCompanyKPIOverview = async (companyId, month, year, departmentId = null) => {
  const currentMonth = Number(month) || new Date().getMonth() + 1;
  const currentYear = Number(year) || new Date().getFullYear();

  const whereClause = {
    company_id: Number(companyId),
    is_active: "active",
  };

  if (departmentId && departmentId !== "all") {
    whereClause.department_id = Number(departmentId);
  }

  // Get all employees
  const employees = await prisma.employee.findMany({
    where: whereClause,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      profile_path: true,
      base_salary: true,
      department_id: true,
      position_id: true,
      department_employee_department_idTodepartment: {
        select: { id: true, name: true },
      },
      positions: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ department_id: "asc" }, { first_name: "asc" }],
  });

  const empIds = employees.map((e) => e.id);

  // Fetch evaluations for this month/year
  const evaluations = await prisma.kpievaluation.findMany({
    where: {
      company_id: Number(companyId),
      employee_id: { in: empIds },
      month: currentMonth,
      year: currentYear,
    },
    include: {
      evaluator: {
        select: { id: true, first_name: true, last_name: true },
      },
    },
  });

  const evalMap = new Map();
  evaluations.forEach((e) => evalMap.set(e.employee_id, e));

  let goodCount = 0;
  let avgCount = 0;
  let needsImpCount = 0;
  let totalScoreSum = 0;

  const rows = employees.map((emp) => {
    const evaluation = evalMap.get(emp.id) || null;

    if (evaluation) {
      totalScoreSum += Number(evaluation.total_score);
      if (evaluation.overall_grade === "GOOD") goodCount++;
      else if (evaluation.overall_grade === "AVERAGE") avgCount++;
      else if (evaluation.overall_grade === "NEEDS_IMPROVEMENT") needsImpCount++;
    }

    return {
      employee: emp,
      evaluation,
      isEvaluated: !!evaluation,
    };
  });

  const evaluatedCount = evaluations.length;
  const pendingCount = employees.length - evaluatedCount;
  const avgScore = evaluatedCount > 0 ? Number((totalScoreSum / evaluatedCount).toFixed(2)) : 0;
  const completionRate = employees.length > 0 ? Math.round((evaluatedCount / employees.length) * 100) : 0;

  return {
    month: currentMonth,
    year: currentYear,
    stats: {
      totalEmployees: employees.length,
      evaluatedCount,
      pendingCount,
      completionRate,
      averageScore: avgScore,
      goodCount,
      avgCount,
      needsImpCount,
    },
    records: rows,
  };
};

/**
 * 5. Yearly Annual Summary (12-Month Average Matrix)
 */
export const getYearlyKPISummary = async (companyId, year, departmentId = null) => {
  const currentYear = Number(year) || new Date().getFullYear();

  const whereClause = {
    company_id: Number(companyId),
    is_active: "active",
  };

  if (departmentId && departmentId !== "all") {
    whereClause.department_id = Number(departmentId);
  }

  const employees = await prisma.employee.findMany({
    where: whereClause,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      profile_path: true,
      department_employee_department_idTodepartment: {
        select: { id: true, name: true },
      },
      positions: {
        select: { id: true, name: true },
      },
    },
    orderBy: { first_name: "asc" },
  });

  const empIds = employees.map((e) => e.id);

  const evaluations = await prisma.kpievaluation.findMany({
    where: {
      company_id: Number(companyId),
      employee_id: { in: empIds },
      year: currentYear,
    },
  });

  // Group by employee
  const evalByEmp = new Map();
  evaluations.forEach((ev) => {
    if (!evalByEmp.has(ev.employee_id)) {
      evalByEmp.set(ev.employee_id, []);
    }
    evalByEmp.get(ev.employee_id).push(ev);
  });

  const summary = employees.map((emp) => {
    const empEvals = evalByEmp.get(emp.id) || [];
    const monthlyScores = Array(12).fill(null);

    let totalScore = 0;
    let evalCount = 0;

    empEvals.forEach((ev) => {
      if (ev.month >= 1 && ev.month <= 12) {
        monthlyScores[ev.month - 1] = {
          month: ev.month,
          discipline: ev.discipline_rating,
          output: ev.output_rating,
          attitude: ev.attitude_rating,
          score: Number(ev.total_score),
          grade: ev.overall_grade,
        };
        totalScore += Number(ev.total_score);
        evalCount++;
      }
    });

    const yearlyAvg = evalCount > 0 ? Number((totalScore / evalCount).toFixed(2)) : 0;
    let yearlyGrade = "NONE";
    if (evalCount > 0) {
      if (yearlyAvg >= 2.5) yearlyGrade = "GOOD";
      else if (yearlyAvg >= 1.7) yearlyGrade = "AVERAGE";
      else yearlyGrade = "NEEDS_IMPROVEMENT";
    }

    return {
      employee: emp,
      months: monthlyScores,
      evaluatedMonths: evalCount,
      yearlyAverageScore: yearlyAvg,
      yearlyGrade,
    };
  });

  return {
    year: currentYear,
    totalEmployees: employees.length,
    employees: summary,
  };
};

/**
 * 6. Bulk Approve KPI Evaluations (HR Action)
 */
export const approveKPIEvaluations = async (companyId, evaluationIds = []) => {
  if (!evaluationIds.length) return { count: 0 };

  const res = await prisma.kpievaluation.updateMany({
    where: {
      company_id: Number(companyId),
      id: { in: evaluationIds.map((id) => Number(id)) },
    },
    data: {
      status: "approved",
    },
  });

  return res;
};

/**
 * 7. Send KPI Evaluation Reminders to Managers
 */
export const sendKPIReminders = async (companyId, month, year) => {
  const currentMonth = Number(month) || new Date().getMonth() + 1;
  const currentYear = Number(year) || new Date().getFullYear();

  // Find all departments and their managers
  const departments = await prisma.department.findMany({
    where: {
      company_id: Number(companyId),
      manager_id: { not: null },
    },
    include: {
      employee_department_manager_idToemployee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          telegram_chat_id: true,
          telegram_username: true,
        },
      },
    },
  });

  let remindedCount = 0;

  for (const dept of departments) {
    const manager = dept.employee_department_manager_idToemployee;
    if (!manager) continue;

    // Check count of pending subordinates in this department
    const subordinates = await prisma.employee.findMany({
      where: {
        company_id: Number(companyId),
        department_id: dept.id,
        is_active: "active",
        id: { not: manager.id },
      },
      select: { id: true },
    });

    const evaluated = await prisma.kpievaluation.count({
      where: {
        company_id: Number(companyId),
        employee_id: { in: subordinates.map((s) => s.id) },
        month: currentMonth,
        year: currentYear,
      },
    });

    const pending = subordinates.length - evaluated;

    if (pending > 0) {
      // 1. In-app notification
      const user = await prisma.user.findFirst({
        where: { employee_id: manager.id },
      });

      if (user) {
        await prisma.notification.create({
          data: {
            company_id: Number(companyId),
            to_user_id: user.id,
            title: `KPI Evaluation Reminder (${currentMonth}/${currentYear})`,
            body: `You have ${pending} pending subordinate evaluation(s) in ${dept.name} to complete.`,
          },
        });
      }

      // 2. Telegram message if available
      try {
        if (manager.telegram_chat_id) {
          const comp = await prisma.company.findUnique({
            where: { id: Number(companyId) },
            select: { telegram_bot_token: true },
          });
          if (comp?.telegram_bot_token) {
            const msg = `📊 <b>KPI Evaluation Reminder</b>\n` +
              `Hello ${manager.first_name},\n` +
              `You have <b>${pending} pending evaluation(s)</b> for <b>${dept.name}</b> for Month ${currentMonth}/${currentYear}.\n` +
              `Please log in to your mobile app or web dashboard to complete the quick evaluation.`;
            await sendTelegramMessage(comp.telegram_bot_token, manager.telegram_chat_id, msg);
          }
        }
      } catch (err) {
        console.error(`[KPI Remind] Telegram failed for manager ${manager.id}:`, err.message);
      }

      remindedCount++;
    }
  }

  return { success: true, remindedManagers: remindedCount };
};
