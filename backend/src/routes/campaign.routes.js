import express from "express";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignById,
} from "../controllers/campaign.controller.js";
import {
  listEmailRecipients,
  listEmailSenders,
  previewCampaignEmail,
  sendCampaignEmail,
  sendCampaignEmailTest,
  listCampaignEmails,
  getCampaignEmail,
} from "../controllers/campaign-email.controller.js";
import { requirePermission } from "../middleware/auth.middleware.js";

const router = express.Router();
const view = requirePermission("CAMPAIGNS", "VIEW");
const create = requirePermission("CAMPAIGNS", "CREATE");
const edit = requirePermission("CAMPAIGNS", "EDIT");
const remove = requirePermission("CAMPAIGNS", "DELETE");

// Email routes must stay above "/:id" so "emails" is not read as a campaign id.
router.get("/email-recipients", view, listEmailRecipients);
router.get("/email-senders", view, listEmailSenders);
router.get("/emails", view, listCampaignEmails);
router.get("/emails/:id", view, getCampaignEmail);
router.post("/emails/preview", view, previewCampaignEmail);
router.post("/emails/send", create, sendCampaignEmail);
router.post("/emails/test", view, sendCampaignEmailTest);

router.get("/", view, getCampaigns);
router.post("/", create, createCampaign);
router.get("/:id", view, getCampaignById);
router.put("/:id", edit, updateCampaign);
router.delete("/:id", remove, deleteCampaign);

export default router;
