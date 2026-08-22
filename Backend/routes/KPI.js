import express from "express";
import {
  getMyKPIHistoryController,
  getTeamKPIController,
  evaluateEmployeeController,
  getCompanyKPIOverviewController,
  getYearlyKPISummaryController,
  approveKPIEvaluationsController,
  sendKPIRemindersController,
} from "../controller/KPI.js";

const router = express.Router();

// Employee routes
router.get("/my-evaluations", getMyKPIHistoryController);

// Manager routes
router.get("/team", getTeamKPIController);
router.post("/evaluate", evaluateEmployeeController);

// HR & Admin routes
router.get("/overview", getCompanyKPIOverviewController);
router.get("/yearly-summary", getYearlyKPISummaryController);
router.post("/approve", approveKPIEvaluationsController);
router.post("/remind", sendKPIRemindersController);

export default router;
