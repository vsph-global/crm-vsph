import express from "express";
import {
  getContacts,
  createContact,
  updateContact,
  getContactById,
  deleteContact,
} from "../controllers/contact.controller.js";
import { requirePermission } from "../middleware/auth.middleware.js";

import { getContactEntries, createContactEntry, updateRelationship, saveLinkedOpportunity, correctContactEntry } from "../controllers/contactActivity.controller.js";

const router = express.Router();
const view = requirePermission("CONTACTS", "VIEW");
const create = requirePermission("CONTACTS", "CREATE");
const edit = requirePermission("CONTACTS", "EDIT");
const remove = requirePermission("CONTACTS", "DELETE");

router.get("/", view, getContacts);
router.post("/", create, createContact);
router.get("/:id/activities", view, getContactEntries);
router.post("/:id/activities", view, create, createContactEntry);
router.patch("/:id/activities/:entryId", view, edit, correctContactEntry);
router.delete("/:id/activities/:entryId", view, remove, correctContactEntry);
router.patch("/:id/relationship", view, edit, updateRelationship);
router.post("/:id/opportunities", view, requirePermission("OPPORTUNITIES","VIEW"), requirePermission("OPPORTUNITIES","CREATE"), saveLinkedOpportunity);
router.patch("/:id/opportunities/:opportunityId", view, requirePermission("OPPORTUNITIES","VIEW"), requirePermission("OPPORTUNITIES","EDIT"), saveLinkedOpportunity);
router.get("/:id", view, getContactById);
router.put("/:id", edit, updateContact);
router.delete("/:id", remove, deleteContact);

export default router;
