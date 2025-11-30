import express from "express";
const router = express.Router();
import { addEmployeeController } from "../controller/Employee.js";

router.post("/add-employee", addEmployeeController);

export default router;
