import express from "express";
const router = express.Router();
import { addDocumentTypeController } from "../controller/Document.js";

router.post("/add-document-type", addDocumentTypeController);

export default router;
