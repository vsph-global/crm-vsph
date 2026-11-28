/**
 * Senders may only send as their own address when that address is on a domain
 * verified in Resend. EMAIL_SENDER_DOMAINS defaults to the EMAIL_FROM domain.
 */
import {
  LOGO_URL,
  COMPANY_NAME,
  COMPANY_TAGLINE,
  COMPANY_WEBSITE,
  wrapper,
  header,
  footer,
  btn,
  line,
  heading,
} from "../lib/email-templates.js";

export const senderBlockedReason = (email) => {
  const sender = String(email || "").trim().toLowerCase();
  const domain = sender.split("@")[1];
  if (!domain) return "Your account has no email address.";

  const domains = (process.env.EMAIL_SENDER_DOMAINS || process.env.EMAIL_FROM || "onboarding@resend.dev")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .map((entry) => (entry.includes("@") ? entry.split("@")[1] : entry));

  if (!domains.includes(domain)) {
    return `Your email domain (${domain}) is not verified for sending in Resend. Ask an administrator to verify it.`;
  }

  // resend.dev is shared: Resend only accepts its own demo address.
  if (domain === "resend.dev" && sender !== String(process.env.EMAIL_FROM || "").toLowerCase()) {
    return "The shared resend.dev sender cannot send as your address. Verify your organization's domain in Resend first.";
  }

  return null;
};

export const sendMail = async ({ from, to, subject, text, html, replyTo }) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error("Email sending is not configured. Set RESEND_API_KEY.");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Email provider rejected the message (${response.status}): ${detail}`);
    error.status = 502;
    throw error;
  }

  return { delivered: true, transport: "resend" };
};

/**
 * Send a single email via Resend. Used as a fallback when a batch fails so we
 * can record per-recipient success/failure instead of marking a whole chunk
 * as failed.
 */
export const sendMailSingle = async ({ from, to, subject, text, html, replyTo, attachments }) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error("Email sending is not configured. Set RESEND_API_KEY.");
    error.status = 503;
    throw error;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      ...(html ? { html } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(attachments ? { attachments } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Email provider rejected the message (${response.status}): ${detail}`);
    error.status = 502;
    throw error;
  }

  return { delivered: true, transport: "resend" };
};

/**
 * Send up to 100 messages in one Resend batch request. All messages share the
 * same sender. On batch success every recipient is marked sent. On batch
 * failure the caller falls back to per-recipient sends so each result is
 * recorded individually.
 *
 * Each message may include `attachments: [{ filename, content, content_type }]`
 * where `content` is a base64 string (no data-URL prefix).
 */
export const sendMailBatch = async (messages) => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error("Email sending is not configured. Set RESEND_API_KEY.");
    error.status = 503;
    throw error;
  }
  if (!Array.isArray(messages) || messages.length === 0) return { delivered: 0, results: [] };
  if (messages.length > 100) throw new Error("Resend batches accept at most 100 emails.");

  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      messages.map(({ from, to, subject, text, html, replyTo, attachments }) => ({
        from,
        to: [to],
        subject,
        text,
        ...(html ? { html } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(attachments ? { attachments } : {}),
      }))
    ),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Email provider rejected the batch (${response.status}): ${detail}`);
    error.status = 502;
    throw error;
  }

  return {
    delivered: messages.length,
    transport: "resend",
    results: messages.map((message) => ({ to: message.to, ok: true })),
  };
};

/**
 * Try a Resend batch; if it fails, send each message individually so every
 * recipient gets its own success/failure record. Returns per-recipient results.
 */
export const sendMailBatchOrPerRecipient = async (messages) => {
  try {
    const result = await sendMailBatch(messages);
    return { ok: true, results: result.results };
  } catch (batchError) {
    const results = [];
    for (const message of messages) {
      try {
        await sendMailSingle(message);
        results.push({ to: message.to, ok: true });
      } catch (singleError) {
        results.push({ to: message.to, ok: false, error: String(singleError.message || "Send failed").slice(0, 500) });
      }
    }
    return { ok: false, results };
  }
};

/**
 * Email adapter for invitation delivery.
 * - If RESEND_API_KEY is configured, sends via Resend API.
 * - Else if EMAIL_WEBHOOK_URL is configured, POSTs the message there.
 * - In development, prints the invitation URL to the server console.
 * - In production with no provider, fails loudly without logging the token.
 */
export const sendInvitationEmail = async ({
  to,
  name,
  organizationName,
  inviteUrl,
  isDirectAccount = false,
  password,
}) => {
  // Tenant names often already say "CRM" or "VSPH CRM"; avoid "VSPH CRM CRM".
  const org = String(organizationName || "").trim() || "your organization";
  const orgCrm = /crm/i.test(org) ? org : `${org} CRM`;
  const onVsph = /vsph/i.test(org) ? "" : " on VSPH CRM";

  const subject = isDirectAccount
    ? `Your ${orgCrm} account is ready`
    : `You are invited to ${org}`;

  const text = isDirectAccount
    ? [
        `Hello${name ? ` ${name}` : ""},`,
        "",
        `Your account has been created on ${orgCrm}.`,
        "Sign in with the following credentials:",
        "",
        `Email: ${to}`,
        `Password: ${password}`,
        "",
        `Open this link to sign in: ${inviteUrl}`,
        "",
        "You can change your password after signing in.",
      ].join("\n")
    : [
        `Hello${name ? ` ${name}` : ""},`,
        "",
        `You have been invited to join ${org}${onVsph}.`,
        "Open this link to set your password and activate your account:",
        inviteUrl,
        "",
        "This link can be used once and expires soon. If you were not expecting it, ignore this email.",
      ].join("\n");

  const html = isDirectAccount
    ? wrapper(
        `Your ${orgCrm} account is ready`,
        `${heading("Your account is ready", "28px")}
        ${line(`Hello${name ? ` ${name}` : ""}!`, "#334155", "17px", "500")}
        ${line(`Your account has been created on <b>${orgCrm}</b>.`)}
        ${line("Sign in with these credentials:")}
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:0 0 14px 0;font-size:16px;color:#334155;"><b>Email:</b> ${to}</td>
          </tr>
          <tr>
            <td style="padding:0 0 14px 0;font-size:16px;color:#334155;"><b>Password:</b> ${password}</td>
          </tr>
        </table>
        ${btn("Sign in to CRM", inviteUrl)}
        ${line("You can change your password after signing in.", "#64748b", "14px", "400")}`,
        [
          `Hello${name ? ` ${name}` : ""},`,
          "",
          `Your account has been created on ${orgCrm}.`,
          "Sign in with the following credentials:",
          "",
          `Email: ${to}`,
          `Password: ${password}`,
          "",
          `Open this link to sign in: ${inviteUrl}`,
          "",
          "You can change your password after signing in.",
        ].join("\n")
      )
    : wrapper(
        `You are invited to ${org}`,
        `${heading(`You're invited to join ${org}!`, "28px")}
        ${line(`Hello${name ? ` ${name}` : ""}!`, "#334155", "17px", "500")}
        ${line(`You have been invited to join <b>${org}</b>${onVsph}.`)}
        ${btn("Set your password & activate account", inviteUrl)}
        ${line("This link can be used once and expires soon. If you were not expecting it, ignore this email.", "#64748b", "14px", "400")}`,
        [
          `Hello${name ? ` ${name}` : ""},`,
          "",
          `You have been invited to join ${org}${onVsph}.`,
          "Open this link to set your password and activate your account:",
          inviteUrl,
          "",
          "This link can be used once and expires soon. If you were not expecting it, ignore this email.",
        ].join("\n")
      );

  // Resend (preferred)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: [to],
        subject,
        text,
        html,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Resend rejected: ${response.status} ${err}`);
    }
    return { delivered: true, transport: "resend" };
  }

  // Webhook fallback
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (webhook) {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.EMAIL_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ to, subject, text }),
    });
    if (!response.ok) {
      throw new Error(`Email provider rejected the message (${response.status})`);
    }
    return { delivered: true, transport: "webhook" };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("No email provider configured. Set RESEND_API_KEY or EMAIL_WEBHOOK_URL.");
  }

  // Development-only fallback. Never log the token in production.
  console.log(`[invite:dev] ${to} -> ${inviteUrl}`);
  return { delivered: false, transport: "console", devInviteUrl: inviteUrl };
};
