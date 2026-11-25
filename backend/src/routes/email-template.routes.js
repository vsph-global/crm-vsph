import express from "express";
import { requirePermission } from "../middleware/auth.middleware.js";
import {
  listEmailTemplates,
  createEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from "../controllers/email.controller.js";

const router = express.Router();

router.get("/", requirePermission("CONTACTS","VIEW"), listEmailTemplates);
router.post("/", requirePermission("CONTACTS","CREATE"), createEmailTemplate);
router.get("/:id", requirePermission("CONTACTS","VIEW"), getEmailTemplate);
router.put("/:id", requirePermission("CONTACTS","EDIT"), updateEmailTemplate);
router.delete("/:id", requirePermission("CONTACTS","DELETE"), deleteEmailTemplate);

export default router;
