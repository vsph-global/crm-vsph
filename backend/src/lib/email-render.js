/** Replace {{variable}} placeholders in subject/body. */
export const interpolate = (text, vars) =>
  String(text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");

/** Plain-text fallback for bodies that only carry HTML. */
export const htmlToText = (html) =>
  String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();

/**
 * Variables shared by every template. `contact` accepts either the raw Prisma
 * row or the recipient shape built by the campaign controller.
 */
export const emailVars = ({ contact, sender, companyName }) => {
  const first = contact?.contact_firstname ?? "";
  const last = contact?.contact_lastname ?? "";
  const email =
    contact?.email ??
    contact?.contact_professional_email ??
    contact?.contact_personal_email ??
    "";

  return {
    contact_firstname: first,
    contact_lastname: last,
    contact_name: [first, last].filter(Boolean).join(" "),
    contact_email: email,
    employee_name: sender?.user_name ?? sender?.name ?? "",
    employee_email: sender?.user_email ?? sender?.email ?? "",
    company_name: companyName || "VSPH CRM",
    company_tagline: "Innovation. Technology. People.",
    company_website: "vsph.in",
    current_date: new Date().toLocaleDateString(),
  };
};

export const renderEmail = ({ subject, bodyHtml, bodyText, contact, sender, companyName }) => {
  const vars = emailVars({ contact, sender, companyName });
  return {
    subject: interpolate(subject, vars),
    html: interpolate(bodyHtml, vars),
    text: interpolate(bodyText || htmlToText(bodyHtml), vars),
  };
};
