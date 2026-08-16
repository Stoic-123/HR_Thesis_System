import express from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getRecruitmentDashboard,
  getJobPostings,
  getJobPostingById,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  updateCandidateStage,
  deleteCandidate,
  convertCandidateToEmployee,
  getPublicJobPosting,
  publicApplyCandidate,
} from "../controller/recruitment.controller.js";

const router = express.Router();

// ==========================================
// PUBLIC CAREERS ROUTES (No Auth Required)
// ==========================================
router.get("/public/jobs/:id", getPublicJobPosting);
router.post("/public/apply", publicApplyCandidate);

// ==========================================
// PROTECTED HR DASHBOARD ROUTES (Require Auth)
// ==========================================
router.use(requireAuth);

// Dashboard
router.get("/dashboard", getRecruitmentDashboard);

// Job Postings
router.get("/jobs", getJobPostings);
router.get("/jobs/:id", getJobPostingById);
router.post("/jobs", createJobPosting);
router.put("/jobs/:id", updateJobPosting);
router.delete("/jobs/:id", deleteJobPosting);

// Candidates
router.get("/candidates", getCandidates);
router.get("/candidates/:id", getCandidateById);
router.post("/candidates", createCandidate);
router.put("/candidates/:id", updateCandidate);
router.patch("/candidates/:id/stage", updateCandidateStage);
router.delete("/candidates/:id", deleteCandidate);

// Convert Candidate to Employee
router.post("/candidates/:id/convert-to-employee", convertCandidateToEmployee);

export default router;
