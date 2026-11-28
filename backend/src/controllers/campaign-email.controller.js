import { prisma } from "../lib/prisma.js";
import { getTenantFilter } from "../middleware/auth.middleware.js";
import { isEmail } from "../lib/onboarding.logic.js";
import { isOrgAdmin } from "../lib/roles.js";
import { renderEmail } from "../lib/email-render.js";
import { sendMailBatchOrPerRecipient, sendMailSingle, senderBlockedReason } from "../services/email.service.js";

const MAX_RECIPIENTS = 2000;
// Resend accepts 100 emails per batch and 10 requests per second.
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 250;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fullName = (contact) =>
  [contact?.contact_firstname, contact?.contact_lastname].filter(Boolean).join(" ");

const preferredEmail = (contact) =>
  String(contact?.contact_professional_email || contact?.contact_personal_email || "").trim();

const contactSelect = {
  contact_id: true,
  tenant_fk: true,
  contact_firstname: true,
  contact_lastname: true,
  contact_professional_email: true,
  contact_personal_email: true,
};

/** GET /api/campaigns/email-recipients?search= */
export const listEmailRecipients = async (req, res) => {
  try {
    const { search = "" } = req.query;
    const where = { contact_deleted_at: null, ...getTenantFilter(req) };

    if (search) {
      where.OR = [
        { contact_firstname: { contains: search } },
        { contact_lastname: { contains: search } },
        { contact_professional_email: { contains: search } },
        { contact_personal_email: { contains: search } },
        { account: { account_name: { contains: search } } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      take: MAX_RECIPIENTS,
      orderBy: { contact_created_at: "desc" },
      select: {
        ...contactSelect,
        account: { select: { account_name: true } },
        contact_industry: { select: { industry_name: true } },
        contact_segment: true,
        contact_status: true,
        contact_owner: { select: { user_name: true } },
      },
    });

    const data = contacts
      .map((contact) => ({
        contact_id: contact.contact_id,
        name: fullName(contact) || preferredEmail(contact),
        email: preferredEmail(contact),
        account_name: contact.account?.account_name || "",
        industry: contact.contact_industry?.industry_name || "",
        segment: contact.contact_segment || "",
        status: contact.contact_status || "",
        owner: contact.contact_owner?.user_name || "",
      }))
      .filter((contact) => isEmail(contact.email));

    return res.status(200).json({
      success: true,
      data,
      total: data.length,
      skipped: contacts.length - data.length,
    });
  } catch (error) {
    console.error("List campaign recipients failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/campaigns/email-senders */
export const listEmailSenders = async (req, res) => {
  try {
    const self = {
      user_id: req.user.id,
      user_name: req.user.name,
      user_email: req.user.email,
    };

    let users = [self];
    if (req.user.tenantFk && isOrgAdmin(req.user)) {
      // Platform admins may send on behalf of any tenant they can see; tenant
      // admins stay inside their own organization.
      users = await prisma.user.findMany({
        where: {
          ...(req.user.role === "SUPER_ADMIN" ? {} : { tenant_fk: req.user.tenantFk }),
          user_status: true,
          user_deleted_at: null,
        },
        select: {
          user_id: true,
          user_name: true,
          user_email: true,
          tenant_fk: true,
          tenant: { select: { tenant_name: true } },
        },
        orderBy: { user_name: "asc" },
      });
    }

    const data = users
      .filter((user) => isEmail(user.user_email) && !senderBlockedReason(user.user_email))
      .map((user) => ({
        user_id: user.user_id,
        name: user.user_name,
        email: user.user_email,
        tenant_fk: user.tenant_fk || req.user.tenantFk || null,
        tenant_name: user.tenant?.tenant_name || "",
      }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("List campaign senders failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** POST /api/campaigns/emails/preview */
export const previewCampaignEmail = async (req, res) => {
  try {
    const { subject, body_html, body_text, contact_id } = req.body || {};

    if (!String(subject || "").trim()) {
      return res.status(400).json({ success: false, message: "A subject is required." });
    }
    if (!String(body_html || "").trim()) {
      return res.status(400).json({ success: false, message: "A message body is required." });
    }

    let contact = null;
    if (contact_id) {
      contact = await prisma.contact.findFirst({
        where: { contact_id, contact_deleted_at: null, ...getTenantFilter(req) },
        select: contactSelect,
      });
    }

    const rendered = renderEmail({
      subject,
      bodyHtml: body_html,
      bodyText: body_text,
      contact: contact || {
        contact_firstname: "Sample",
        contact_lastname: "Contact",
        contact_professional_email: "sample@example.com",
      },
      sender: { user_name: req.user.name, user_email: req.user.email },
      companyName: req.user.tenantName,
    });

    return res.status(200).json({ success: true, data: rendered });
  } catch (error) {
    console.error("Preview campaign email failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** POST /api/campaigns/emails/send */
export const sendCampaignEmail = async (req, res) => {
  try {
    const {
      subject,
      body_html,
      body_text,
      template_id,
      sender_email,
      contact_ids,
      attachments,
    } = req.body || {};

    if (!String(subject || "").trim()) {
      return res.status(400).json({ success: false, message: "A subject is required." });
    }
    if (!String(body_html || "").trim()) {
      return res.status(400).json({ success: false, message: "A message body is required." });
    }

    const ids = Array.isArray(contact_ids) ? [...new Set(contact_ids.filter(Boolean))] : [];
    if (!ids.length) {
      return res.status(400).json({ success: false, message: "Select at least one contact." });
    }
    if (ids.length > MAX_RECIPIENTS) {
      return res.status(400).json({
        success: false,
        message: `You can send to at most ${MAX_RECIPIENTS} contacts at a time.`,
      });
    }

    const contacts = await prisma.contact.findMany({
      where: { contact_id: { in: ids }, contact_deleted_at: null, ...getTenantFilter(req) },
      select: contactSelect,
    });

    const tenants = [...new Set(contacts.map((contact) => contact.tenant_fk))];
    if (tenants.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Select contacts from a single organization.",
      });
    }
    const tenantId = tenants[0] || req.user.tenantFk;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "Select contacts from a single organization.",
      });
    }

    const sender = await prisma.user.findFirst({
      where: {
        user_email: String(sender_email || "").trim().toLowerCase(),
        user_status: true,
        user_deleted_at: null,
      },
      select: { user_id: true, user_name: true, user_email: true, tenant_fk: true },
    });

    if (!sender) {
      return res.status(400).json({ success: false, message: "Choose a valid sender." });
    }
    if (!isOrgAdmin(req.user) && sender.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only send email as yourself.",
      });
    }
    if (sender.tenant_fk !== tenantId) {
      return res.status(400).json({ success: false, message: "Choose a sender from your organization." });
    }

    const blocked = senderBlockedReason(sender.user_email);
    if (blocked) {
      return res.status(400).json({ success: false, message: blocked });
    }

    const template = template_id
      ? await prisma.email_template.findFirst({
          where: { email_template_id: template_id, tenant_fk: tenantId },
          select: { email_template_id: true, name: true },
        })
      : null;

    const seen = new Set();
    const recipients = [];
    for (const contact of contacts) {
      const email = preferredEmail(contact).toLowerCase();
      if (!isEmail(email) || seen.has(email)) continue;
      seen.add(email);
      recipients.push({ contact, email });
    }

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        message: "None of the selected contacts have a usable email address.",
      });
    }

    const record = await prisma.campaign_email.create({
      data: {
        tenant_fk: tenantId,
        sender_user_fk: sender.user_id,
        template_fk: template?.email_template_id || null,
        template_name: template?.name || null,
        sender_email: sender.user_email,
        subject: String(subject).trim(),
        body_html: String(body_html),
        body_text: body_text ? String(body_text) : null,
        status: "SENDING",
        recipient_count: recipients.length,
      },
    });

    await prisma.campaign_email_recipient.createMany({
      data: recipients.map((recipient) => ({
        campaign_email_fk: record.campaign_email_id,
        contact_fk: recipient.contact.contact_id,
        email: recipient.email,
        name: fullName(recipient.contact),
      })),
    });

    let sent = 0;
    let failed = 0;
    let lastError = "";

    for (let index = 0; index < recipients.length; index += BATCH_SIZE) {
      const chunk = recipients.slice(index, index + BATCH_SIZE);
      const messages = chunk.map((recipient) => {
        const rendered = renderEmail({
          subject,
          bodyHtml: body_html,
          bodyText: body_text,
          contact: recipient.contact,
          sender,
          companyName: req.user.tenantName,
        });
        return {
          from: sender.user_email,
          to: recipient.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
          replyTo: sender.user_email,
          ...(attachments ? { attachments } : {}),
        };
      });

      const result = await sendMailBatchOrPerRecipient(messages);

      const sentEmails = [];
      const failedEmails = [];
      for (const r of result.results) {
        if (r.ok) {
          sentEmails.push(r.to);
          sent += 1;
        } else {
          failedEmails.push(r.to);
          failed += 1;
          lastError = r.error || lastError;
        }
      }

      if (sentEmails.length) {
        await prisma.campaign_email_recipient.updateMany({
          where: {
            campaign_email_fk: record.campaign_email_id,
            email: { in: sentEmails },
          },
          data: { status: "SENT", sent_at: new Date(), error: null },
        });
      }
      if (failedEmails.length) {
        await prisma.campaign_email_recipient.updateMany({
          where: {
            campaign_email_fk: record.campaign_email_id,
            email: { in: failedEmails },
          },
          data: { status: "FAILED", error: lastError },
        });
      }

      if (index + BATCH_SIZE < recipients.length) await delay(BATCH_DELAY_MS);
    }

    const status = failed > 0 ? "FAILED" : "SENT";
    await prisma.campaign_email.update({
      where: { campaign_email_id: record.campaign_email_id },
      data: {
        status,
        sent_count: sent,
        failed_count: failed,
        sent_at: new Date(),
        error: failed > 0 ? lastError : null,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        failed > 0
          ? `Sent ${sent} of ${recipients.length} emails. ${failed} failed.`
          : `Email sent to ${sent} contact${sent === 1 ? "" : "s"}.`,
      data: {
        campaign_email_id: record.campaign_email_id,
        recipient_count: recipients.length,
        sent_count: sent,
        failed_count: failed,
        status,
      },
    });
  } catch (error) {
    console.error("Send campaign email failed:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not send the email.",
    });
  }
};

/** POST /api/campaigns/emails/test — send a one-off test to the logged-in user. */
export const sendCampaignEmailTest = async (req, res) => {
  try {
    const { subject, body_html, body_text, sender_email, attachments } = req.body || {};

    if (!String(subject || "").trim()) {
      return res.status(400).json({ success: false, message: "A subject is required." });
    }
    if (!String(body_html || "").trim()) {
      return res.status(400).json({ success: false, message: "A message body is required." });
    }

    const sender = await prisma.user.findFirst({
      where: {
        user_email: String(sender_email || "").trim().toLowerCase(),
        user_status: true,
        user_deleted_at: null,
      },
      select: { user_id: true, user_name: true, user_email: true, tenant_fk: true },
    });

    if (!sender) {
      return res.status(400).json({ success: false, message: "Choose a valid sender." });
    }
    if (sender.user_id !== req.user.id && !isOrgAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only send a test email as yourself.",
      });
    }

    const blocked = senderBlockedReason(sender.user_email);
    if (blocked) {
      return res.status(400).json({ success: false, message: blocked });
    }

    const rendered = renderEmail({
      subject,
      bodyHtml: body_html,
      bodyText: body_text,
      contact: {
        contact_firstname: req.user.name?.split(" ")[0] || "there",
        contact_lastname: req.user.name?.split(" ").slice(1).join(" ") || "",
        contact_professional_email: req.user.email,
      },
      sender,
      companyName: req.user.tenantName,
    });

    await sendMailSingle({
      from: sender.user_email,
      to: req.user.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: sender.user_email,
      ...(attachments ? { attachments } : {}),
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent to ${req.user.email}.`,
    });
  } catch (error) {
    console.error("Send campaign email test failed:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : "Could not send the test email.",
    });
  }
};

/** GET /api/campaigns/emails */
export const listCampaignEmails = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const take = Math.min(Math.max(1, Number(limit) || 20), 100);
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const where = { ...getTenantFilter(req) };

    const [items, totalRecords] = await Promise.all([
      prisma.campaign_email.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { sender: { select: { user_name: true } } },
      }),
      prisma.campaign_email.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: items,
      pagination: {
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / take),
      },
    });
  } catch (error) {
    console.error("List campaign emails failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

/** GET /api/campaigns/emails/:id */
export const getCampaignEmail = async (req, res) => {
  try {
    const email = await prisma.campaign_email.findFirst({
      where: { campaign_email_id: req.params.id, ...getTenantFilter(req) },
      include: {
        sender: { select: { user_name: true } },
        recipients: { orderBy: { created_at: "asc" } },
      },
    });

    if (!email) {
      return res.status(404).json({ success: false, message: "Email send not found." });
    }

    return res.status(200).json({ success: true, data: email });
  } catch (error) {
    console.error("Get campaign email failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
