import express from "express";
const router = express.Router();
import {
  addCompanyController,
  getCompanyController,
} from "../controller/Company.js";
router.post("/add-company", addCompanyController);
router.get("/get-company", getCompanyController);

export default router;
