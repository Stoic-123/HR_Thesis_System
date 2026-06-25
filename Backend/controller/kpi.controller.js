import kpiService from '../service/kpi.service.js';

export const createCycle = async (req, res) => {
  try {
    const cycle = await kpiService.createCycle(req.body, req.user.company_id);
    res.status(201).json(cycle);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCycles = async (req, res) => {
  try {
    const cycles = await kpiService.getCycles(req.user.company_id);
    res.json(cycles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCycle = async (req, res) => {
  // TODO
  res.json({ message: "Not implemented yet" });
};

export const getTemplates = async (req, res) => {
  try {
    const templates = await kpiService.getTemplates(req.user.company_id);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const template = await kpiService.createTemplate(req.body, req.user.company_id);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addTemplateGoal = async (req, res) => {
  try {
    const goal = await kpiService.addTemplateGoal(req.params.id, req.body);
    res.status(201).json(goal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const assignTemplate = async (req, res) => {
  try {
    const { template_id, department_id, cycle_id } = req.body;
    const result = await kpiService.assignTemplateToDepartment(template_id, department_id, cycle_id, req.user.company_id);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const finalizeScores = async (req, res) => {
  // TODO: Annual calculation
  res.json({ message: "Not implemented yet" });
};

// ======================
// MANAGER
// ======================
export const getTeamDashboard = async (req, res) => {
  try {
    const { cycle_id } = req.query;
    if (!cycle_id) return res.status(400).json({ error: "cycle_id is required" });
    
    const dashboard = await kpiService.getTeamDashboard(req.user.employee_id, cycle_id);
    res.json(dashboard);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

export const getTeamMembers = async (req, res) => {
  // Reusing dashboard logic for now or specific member list
  res.json({ message: "Use getTeamDashboard" });
};

export const getQuarterlyReviews = async (req, res) => {
  // TODO
  res.json([]);
};

export const submitQuarterlyReview = async (req, res) => {
  try {
    const review = await kpiService.submitQuarterlyReview(req.user.employee_id, req.body);
    res.status(201).json(review);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

// ======================
// EMPLOYEE
// ======================
export const getMyDashboard = async (req, res) => {
  try {
    const { cycle_id } = req.query;
    if (!cycle_id) return res.status(400).json({ error: "cycle_id is required" });
    
    const dashboard = await kpiService.getMyDashboard(req.user.employee_id, cycle_id);
    res.json(dashboard);
  } catch (error) {
    console.error("[getMyDashboard ERROR]", error);
    res.status(500).json({ error: error.message });
  }
};

export const getMyGoals = async (req, res) => {
  res.json({ message: "Use my-dashboard, goals included" });
};

export const addCustomGoal = async (req, res) => {
  // TODO
  res.json({ message: "Not implemented yet" });
};

export const submitManagerScore = async (req, res) => {
  try {
    const result = await kpiService.submitManagerScore(req.user.employee_id, req.body);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

export const submitHrScore = async (req, res) => {
  try {
    // Only HR can do this (currently any authorized person can hit this route, ideally add role check)
    const result = await kpiService.submitHrScore(req.user.company_id, req.body);
    res.json(result);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

export const getEvaluations = async (req, res) => {
  try {
    const { cycle_id } = req.query;
    if (!cycle_id) return res.status(400).json({ error: "cycle_id is required" });
    const data = await kpiService.getEvaluations(cycle_id);
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const kpiController = { createCycle, getCycles, updateCycle, getTemplates, createTemplate, addTemplateGoal, assignTemplate, finalizeScores, getTeamDashboard, getTeamMembers, getQuarterlyReviews, submitQuarterlyReview, getMyDashboard, getMyGoals, addCustomGoal, submitManagerScore, submitHrScore, getEvaluations };
export default kpiController;
