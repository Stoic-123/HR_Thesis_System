import recruitmentService from "../service/recruitment.service.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage } from "../service/Storage.js";

// ==========================================
// DASHBOARD
// ==========================================
export const getRecruitmentDashboard = async (req, res) => {
  try {
    const stats = await recruitmentService.getDashboardStats(req.user.company_id);
    res.json({ result: true, data: stats });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

// ==========================================
// JOB POSTINGS
// ==========================================
export const getJobPostings = async (req, res) => {
  try {
    const jobs = await recruitmentService.getJobPostings(req.user.company_id, req.query);
    res.json({ result: true, data: jobs });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getJobPostingById = async (req, res) => {
  try {
    const job = await recruitmentService.getJobPostingById(req.params.id, req.user.company_id);
    res.json({ result: true, data: job });
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};

export const createJobPosting = async (req, res) => {
  try {
    const job = await recruitmentService.createJobPosting(req.body, req.user.company_id);
    res.status(201).json({ result: true, message: "Job posting created successfully", data: job });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const updateJobPosting = async (req, res) => {
  try {
    await recruitmentService.updateJobPosting(req.params.id, req.user.company_id, req.body);
    res.json({ result: true, message: "Job posting updated successfully" });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const deleteJobPosting = async (req, res) => {
  try {
    await recruitmentService.deleteJobPosting(req.params.id, req.user.company_id);
    res.json({ result: true, message: "Job posting deleted successfully" });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

// ==========================================
// CANDIDATES
// ==========================================
export const getCandidates = async (req, res) => {
  try {
    const candidates = await recruitmentService.getCandidates(req.user.company_id, req.query);
    res.json({ result: true, data: candidates });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export const getCandidateById = async (req, res) => {
  try {
    const candidate = await recruitmentService.getCandidateById(req.params.id, req.user.company_id);
    res.json({ result: true, data: candidate });
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};

export const createCandidate = async (req, res) => {
  try {
    let resume_url = req.body.resume_url || null;

    if (req.files && req.files.resume) {
      const file = req.files.resume;
      const fileCheck = validateFile(file, "document");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const fileName = `${Date.now()}_${file.name}`;
      resume_url = await uploadToStorage(file.data, "resumes", fileName, file.mimetype);
    }

    const candidate = await recruitmentService.createCandidate(
      { ...req.body, resume_url },
      req.user.company_id
    );

    res.status(201).json({ result: true, message: "Candidate added successfully", data: candidate });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    let resume_url = req.body.resume_url;

    if (req.files && req.files.resume) {
      const file = req.files.resume;
      const fileCheck = validateFile(file, "document");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const fileName = `${Date.now()}_${file.name}`;
      resume_url = await uploadToStorage(file.data, "resumes", fileName, file.mimetype);
    }

    const updateData = { ...req.body };
    if (resume_url !== undefined) updateData.resume_url = resume_url;

    await recruitmentService.updateCandidate(req.params.id, req.user.company_id, updateData);
    res.json({ result: true, message: "Candidate updated successfully" });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const updateCandidateStage = async (req, res) => {
  try {
    const { stage } = req.body;
    if (!stage) return res.status(400).json({ result: false, message: "Stage is required" });

    await recruitmentService.updateCandidateStage(req.params.id, req.user.company_id, stage);
    res.json({ result: true, message: `Candidate stage moved to ${stage}` });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    await recruitmentService.deleteCandidate(req.params.id, req.user.company_id);
    res.json({ result: true, message: "Candidate deleted successfully" });
  } catch (error) {
    res.status(400).json({ result: false, message: error.message });
  }
};

// ==========================================
// CONVERT TO EMPLOYEE
// ==========================================
export const convertCandidateToEmployee = async (req, res) => {
  try {
    const result = await recruitmentService.convertCandidateToEmployee(
      req.params.id,
      req.user.company_id,
      req.body,
      req.user,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      }
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("[Convert Candidate Error]:", error);
    res.status(400).json({ result: false, message: error.message });
  }
};

// ==========================================
// PUBLIC CAREERS CONTROLLER (No Auth)
// ==========================================
export const getPublicJobPosting = async (req, res) => {
  try {
    const job = await recruitmentService.getPublicJobPosting(req.params.id);
    res.json({ result: true, data: job });
  } catch (error) {
    res.status(404).json({ result: false, message: error.message });
  }
};

export const publicApplyCandidate = async (req, res) => {
  try {
    let resume_url = req.body.resume_url || null;

    if (req.files && req.files.resume) {
      const file = req.files.resume;
      const fileCheck = validateFile(file, "document");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const fileName = `public_${Date.now()}_${file.name}`;
      resume_url = await uploadToStorage(file.data, "resumes", fileName, file.mimetype);
    }

    const result = await recruitmentService.publicApplyCandidate({
      ...req.body,
      resume_url,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("[Public Apply Error]:", error);
    res.status(400).json({ result: false, message: error.message });
  }
};

