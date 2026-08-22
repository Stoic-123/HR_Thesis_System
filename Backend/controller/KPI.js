import * as kpiService from "../service/KPI.js";

/**
 * Get personal KPI history (Employee View)
 */
export const getMyKPIHistoryController = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    const year = req.query.year || new Date().getFullYear();

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: "No employee profile linked to your user account.",
      });
    }

    const data = await kpiService.getEmployeeKPIHistory(employeeId, year);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[KPI Controller] getMyKPIHistoryController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KPI history.",
    });
  }
};

/**
 * Get Team evaluations for a manager (Manager View)
 */
export const getTeamKPIController = async (req, res) => {
  try {
    const managerId = req.user.employee_id;
    const companyId = req.user.company_id;
    const { month, year } = req.query;

    const data = await kpiService.getTeamKPIEvaluations(
      managerId,
      companyId,
      month,
      year
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[KPI Controller] getTeamKPIController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch team evaluations.",
    });
  }
};

/**
 * Submit or update a single subordinate KPI evaluation (Manager Action)
 */
export const evaluateEmployeeController = async (req, res) => {
  try {
    const evaluatorId = req.user.employee_id;
    const companyId = req.user.company_id;
    const {
      employeeId,
      month,
      year,
      disciplineRating,
      outputRating,
      attitudeRating,
      managerComment,
      templateId,
    } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Employee ID, month, and year are required.",
      });
    }

    const validRatings = ["good", "average", "needs_improvement"];
    if (
      !validRatings.includes(disciplineRating) ||
      !validRatings.includes(outputRating) ||
      !validRatings.includes(attitudeRating)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid rating value. Must be 'good', 'average', or 'needs_improvement'.",
      });
    }

    const evaluation = await kpiService.submitKPIEvaluation({
      companyId,
      evaluatorId,
      employeeId,
      month,
      year,
      disciplineRating,
      outputRating,
      attitudeRating,
      managerComment,
      templateId,
    });

    return res.status(200).json({
      success: true,
      message: "Evaluation submitted successfully.",
      data: evaluation,
    });
  } catch (error) {
    console.error("[KPI Controller] evaluateEmployeeController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit evaluation.",
    });
  }
};

/**
 * Company Overview & Monthly Report (HR & Admin View)
 */
export const getCompanyKPIOverviewController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { month, year, departmentId } = req.query;

    const data = await kpiService.getCompanyKPIOverview(
      companyId,
      month,
      year,
      departmentId
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[KPI Controller] getCompanyKPIOverviewController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch KPI overview.",
    });
  }
};

/**
 * Annual 12-Month Summary (HR View)
 */
export const getYearlyKPISummaryController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { year, departmentId } = req.query;

    const data = await kpiService.getYearlyKPISummary(
      companyId,
      year,
      departmentId
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[KPI Controller] getYearlyKPISummaryController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch yearly KPI summary.",
    });
  }
};

/**
 * Bulk Approve KPI Evaluations (HR Action)
 */
export const approveKPIEvaluationsController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { evaluationIds } = req.body;

    if (!Array.isArray(evaluationIds) || evaluationIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "evaluationIds must be a non-empty array.",
      });
    }

    const result = await kpiService.approveKPIEvaluations(
      companyId,
      evaluationIds
    );

    return res.status(200).json({
      success: true,
      message: `${result.count} evaluation(s) approved.`,
      data: result,
    });
  } catch (error) {
    console.error("[KPI Controller] approveKPIEvaluationsController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve evaluations.",
    });
  }
};

/**
 * Trigger Reminders to Managers (Admin / Cron Action)
 */
export const sendKPIRemindersController = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const { month, year } = req.body;

    const result = await kpiService.sendKPIReminders(
      companyId,
      month,
      year
    );

    return res.status(200).json({
      success: true,
      message: `Sent reminders to ${result.remindedManagers} managers.`,
      data: result,
    });
  } catch (error) {
    console.error("[KPI Controller] sendKPIRemindersController Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send reminders.",
    });
  }
};
