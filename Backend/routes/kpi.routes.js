import express from 'express';
const router = express.Router();
import kpiController from '../controller/kpi.controller.js';
import { requireAuth } from '../middleware/auth.js'; 

// Apply authentication to all KPI routes
router.use(requireAuth);

// ==========================================
// ADMIN ROUTES (Requires HR/Admin privileges)
// ==========================================
router.get('/cycles', kpiController.getCycles);
router.post('/cycles', kpiController.createCycle);
router.put('/cycles/:id', kpiController.updateCycle);

router.get('/templates', kpiController.getTemplates);
router.post('/templates', kpiController.createTemplate);
router.post('/templates/:id/goals', kpiController.addTemplateGoal);

router.get('/evaluations', kpiController.getEvaluations);
router.post('/assign', kpiController.assignTemplate);
router.post('/finalize', kpiController.finalizeScores);

// ==========================================
// MANAGER ROUTES (Requires Department Manager status)
// ==========================================
router.get('/team-dashboard', kpiController.getTeamDashboard);
router.get('/team-members', kpiController.getTeamMembers);
router.get('/reviews', kpiController.getQuarterlyReviews);
router.post('/reviews', kpiController.submitQuarterlyReview);
router.post('/manager-score', kpiController.submitManagerScore);
router.post('/hr-score', kpiController.submitHrScore);

// ==========================================
// EMPLOYEE ROUTES
// ==========================================
router.get('/my-dashboard', kpiController.getMyDashboard);
router.get('/my-goals', kpiController.getMyGoals);
router.post('/custom-goals', kpiController.addCustomGoal); // Optional custom goals

export default router;
