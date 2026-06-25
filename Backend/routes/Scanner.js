// Backend/routes/Scanner.js

import express from "express";
const router = express.Router();
import { scanDocumentController, detectDocumentController } from "../controller/Scanner.js";

router.post("/scan", scanDocumentController);
router.post("/detect", detectDocumentController);

export default router;
