import express from "express";
import { getUserController, updateUserController } from "../controller/User.js";
const router = express.Router();

router.get("/get-user", getUserController);
router.put("/update-user/:user_id", updateUserController);
export default router;
