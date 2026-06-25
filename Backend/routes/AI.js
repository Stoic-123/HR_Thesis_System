import express from "express";
const router = express.Router();
import { chatController } from "../controller/Chatbot.js";
import { smartSearchController } from "../controller/SmartSearch.js";
import { classifyIntentController } from "../controller/AIClassifier.js";

router.post("/chat", chatController);
router.get("/smart-search", smartSearchController);
router.post("/classify", classifyIntentController);

export default router;
