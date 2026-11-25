import express from "express";
import { requirePermission } from "../middleware/auth.middleware.js";
import { sendContactEmail } from "../controllers/email.controller.js";

const router = express.Router();

router.post("/send", requirePermission("CONTACTS","CREATE"), sendContactEmail);

export default router;
