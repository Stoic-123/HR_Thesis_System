import express from "express";
const router = express.Router();
import {
  addCompanyController,
  getCompanyController,
  updateCompanyController,
} from "../controller/Company.js";
router.post("/add-company", addCompanyController);
router.get("/get-company", getCompanyController);
router.put("/update-company/:company_id", updateCompanyController);
export default router;
