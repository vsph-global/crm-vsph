import { prisma } from "../lib/prisma.js";
import { isEmail } from "../lib/onboarding.logic.js";
import { interpolate } from "../lib/email-render.js";
import { sendMail, senderBlockedReason } from "../services/email.service.js";

const DEFAULT_COMPANY_TAGLINE = "Innovation. Technology. People.";

/**
 * POST /api/emails/send
 * Body: { to, subject, body } OR { template_id, template_vars, to? }
 */
export const sendContactEmail = async (req, res) => {
  try {
    const { to, subject, body, template_id, template_vars = {} } = req.body || {};

    const sender = req.user.email;
    const blocked = senderBlockedReason(sender);
    if (blocked) {
      return res.status(400).json({ success: false, message: blocked });
    }

    let finalTo = String(to || "").trim();
    let finalSubject = "";
    let finalBody = "";
    let isTemplate = false;
    let plainTextBody = "";

    if (template_id) {
      const template = await prisma.email_template.findFirst({
        where: { email_template_id: template_id, tenant_fk: req.user.tenantFk },
      });
      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Email template not found.",
        });
      }

      const vars = {
        contact_firstname: template_vars.contact_firstname ?? "",
        contact_lastname: template_vars.contact_lastname ?? "",
        contact_name: template_vars.contact_name ?? "",
        contact_email: template_vars.contact_email ?? "",
        employee_name: template_vars.employee_name ?? req.user.name,
        employee_email: template_vars.employee_email ?? sender,
        company_name: template_vars.company_name ?? req.user.tenantName ?? "VSPH CRM",
        company_tagline:
          template_vars.company_tagline ?? DEFAULT_COMPANY_TAGLINE,
        company_website: template_vars.company_website ?? "vsph.in",
        current_date: template_vars.current_date ?? new Date().toLocaleDateString(),
      };

      finalTo = String(template_vars.to || to || "").trim();
      finalSubject = interpolate(template.subject, vars);
      finalBody = template.body_html ? interpolate(template.body_html, vars) : "";
      plainTextBody = template.body_text ? interpolate(template.body_text, vars) : "";
      isTemplate = true;
    } else {
      if (!isEmail(finalTo)) {
        return res.status(400).json({ success: false, message: "A valid recipient email is required." });
      }
      if (!String(subject || "").trim()) {
        return res.status(400).json({ success: false, message: "A subject is required." });
      }
      if (!String(body || "").trim()) {
        return res.status(400).json({ success: false, message: "A message body is required." });
      }
      finalSubject = String(subject).trim();
      finalBody = String(body);
      plainTextBody = finalBody;
    }

    if (!isEmail(finalTo)) {
      return res.status(400).json({ success: false, message: "A valid recipient email is required." });
    }

    await sendMail({
      from: sender,
      to: finalTo,
      subject: finalSubject,
      text: plainTextBody,
      ...(isTemplate ? { html: finalBody } : {}),
      replyTo: sender,
    });

    return res.status(200).json({ success: true, message: "Email sent." });
  } catch (error) {
    console.error("Send email failed:", error.message);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not send the email.",
    });
  }
};

/** GET /api/email-templates */
export const listEmailTemplates = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const where = {
      tenant_fk: req.user.tenantFk,
      ...(search
        ? { OR: [{ name: { contains: search } }, { subject: { contains: search } }] }
        : {}),
    };
    const templates = await prisma.email_template.findMany({
      where,
      orderBy: [{ is_default: "desc" }, { name: "asc" }],
      select: {
        email_template_id: true,
        name: true,
        subject: true,
        body_html: true,
        body_text: true,
        is_default: true,
        created_at: true,
        updated_at: true,
      },
    });
    return res.status(200).json({ success: true, data: templates });
  } catch (error) {
    console.error("List email templates failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** POST /api/email-templates */
export const createEmailTemplate = async (req, res) => {
  try {
    const { name, subject, body_html, body_text, is_default } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Template name is required." });
    }
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, message: "Subject is required." });
    }
    if (!body_html || !String(body_html).trim()) {
      return res.status(400).json({ success: false, message: "Body is required." });
    }

    const tenantId = req.user.tenantFk;

    // If marking as default, unset other defaults for this tenant.
    if (is_default) {
      await prisma.email_template.updateMany({
        where: { tenant_fk: tenantId, is_default: true },
        data: { is_default: false },
      });
    }

    const template = await prisma.email_template.create({
      data: {
        tenant_fk: tenantId,
        name: String(name).trim(),
        subject: String(subject).trim(),
        body_html: String(body_html).trim(),
        body_text: body_text ? String(body_text).trim() : null,
        is_default: Boolean(is_default),
      },
    });

    return res.status(201).json({ success: true, message: "Template created.", data: template });
  } catch (error) {
    console.error("Create email template failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/email-templates/:id */
export const getEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.email_template.findFirst({
      where: { email_template_id: id, tenant_fk: req.user.tenantFk },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    return res.status(200).json({ success: true, data: template });
  } catch (error) {
    console.error("Get email template failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** PUT /api/email-templates/:id */
export const updateEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body_html, body_text, is_default } = req.body || {};

    const template = await prisma.email_template.findFirst({
      where: { email_template_id: id, tenant_fk: req.user.tenantFk },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }

    if (is_default) {
      await prisma.email_template.updateMany({
        where: { tenant_fk: req.user.tenantFk, is_default: true },
        data: { is_default: false },
      });
    }

    const updated = await prisma.email_template.update({
      where: { email_template_id: id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(subject !== undefined ? { subject: String(subject).trim() } : {}),
        ...(body_html !== undefined ? { body_html: String(body_html).trim() } : {}),
        ...(body_text !== undefined ? { body_text: body_text ? String(body_text).trim() : null } : {}),
        ...(is_default !== undefined ? { is_default: Boolean(is_default) } : {}),
      },
    });

    return res.status(200).json({ success: true, message: "Template updated.", data: updated });
  } catch (error) {
    console.error("Update email template failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** DELETE /api/email-templates/:id */
export const deleteEmailTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await prisma.email_template.findFirst({
      where: { email_template_id: id, tenant_fk: req.user.tenantFk },
    });
    if (!template) {
      return res.status(404).json({ success: false, message: "Template not found." });
    }
    await prisma.email_template.delete({ where: { email_template_id: id } });
    return res.status(200).json({ success: true, message: "Template deleted." });
  } catch (error) {
    console.error("Delete email template failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
