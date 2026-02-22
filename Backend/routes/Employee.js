import express from "express";
const router = express.Router();
import {
  addEmployeeController,
  getAllEmployeeController,
} from "../controller/Employee.js";

router.post("/add-employee", addEmployeeController);
router.get("/get-all-employee", getAllEmployeeController);
export default router;
