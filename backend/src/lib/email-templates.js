export const LOGO_URL = "https://app.vsph.in/vsph-logo-email.png";
export const COMPANY_NAME = "VSPH";
export const COMPANY_TAGLINE = "Innovation. Technology. People.";
export const COMPANY_WEBSITE = "vsph.in";
export const FOOTER_TEXT = "You are receiving this because you subscribed at vsph.in.";

export const header = () => `
  <tr>
    <td align="center" style="background:#001B44;padding:30px 20px;">
      <a href="${COMPANY_WEBSITE}" style="text-decoration:none;">
        <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="width:200px;height:auto;display:block;" border="0">
      </a>
    </td>
  </tr>
`;

export const footer = () => `
  <tr>
    <td style="background:#001B44;padding:30px 20px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#ffffff;">VSPH</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;">${COMPANY_TAGLINE}</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#94a3b8;"><a href="${COMPANY_WEBSITE}" style="color:#60a5fa;text-decoration:none;">${COMPANY_WEBSITE}</a></p>
      <p style="margin:0;font-size:11px;color:#475569;">&copy; 2026 VSPH. All rights reserved.</p>
    </td>
  </tr>
`;

export const wrapper = (title, bodyHtml, bodyText) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0, 0, 0, 0.1);">
          ${header()}
          <tr>
            <td style="padding:32px 24px;color:#1e293b;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export const btn = (label, url) => `
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table cellpadding="0" cellspacing="0">
          <tr>
            <td bgcolor="#2563eb" style="border-radius:8px;">
              <a href="${url}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

export const line = (text, color="#334155", size="16px", weight="400") => `
  <p style="margin:0 0 14px 0;font-size:${size};color:${color};font-weight:${weight};line-height:1.6;">${text}</p>
`;

export const heading = (text, size="24px") => `
  <h1 style="margin:0 0 16px 0;font-size:${size};color:#0f172a;font-weight:700;line-height:1.3;">${text}</h1>
`;

export const emailTemplates = [
  {
    name: "Welcome New Client",
    subject: "Welcome to {{company_name}}!",
    html: wrapper(
      "Welcome to {{company_name}}!",
      `${heading("Welcome to {{company_name}}!", "28px")}
      ${line("Hello {{contact_name}},", "#334155", "17px", "500")}
      ${line("We&rsquo;re excited to have you on board. Your CRM account is ready and waiting for you.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Welcome to {{company_name}}!\n\nHello {{contact_name}},\n\nWe're excited to have you on board. Your CRM account is ready and waiting for you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Welcome to {{company_name}}!\n\nHello {{contact_name}},\n\nWe're excited to have you on board. Your CRM account is ready and waiting for you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: true,
  },
  {
    name: "Follow Up",
    subject: "Following up - {{company_name}}",
    html: wrapper(
      "Following up",
      `${heading("Following up", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("I wanted to follow up on our recent conversation at {{company_name}}. Do you have any questions or need any assistance?")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Following up - {{company_name}}\n\nHi {{contact_name}},\n\nI wanted to follow up on our recent conversation at {{company_name}}. Do you have any questions or need any assistance?\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Following up - {{company_name}}\n\nHi {{contact_name}},\n\nI wanted to follow up on our recent conversation at {{company_name}}. Do you have any questions or need any assistance?\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Meeting Request",
    subject: "Meeting Request - {{company_name}}",
    html: wrapper(
      "Meeting Request",
      `${heading("Meeting Request", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("{{employee_name}} from {{company_name}} would like to schedule a meeting with you to discuss how we can help you achieve your goals.")}
      ${line("Please let us know a convenient time, and we&rsquo;ll send over a calendar invite.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Meeting Request - {{company_name}}\n\nHi {{contact_name}},\n\n{{employee_name}} from {{company_name}} would like to schedule a meeting with you to discuss how we can help you achieve your goals.\n\nPlease let us know a convenient time, and we'll send over a calendar invite.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Meeting Request - {{company_name}}\n\nHi {{contact_name}},\n\n{{employee_name}} from {{company_name}} would like to schedule a meeting with you to discuss how we can help you achieve your goals.\n\nPlease let us know a convenient time, and we'll send over a calendar invite.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Meeting Confirmation",
    subject: "Your meeting is confirmed - {{company_name}}",
    html: wrapper(
      "Meeting Confirmation",
      `${heading("Your meeting is confirmed", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Great news! Your meeting with {{employee_name}} from {{company_name}} has been confirmed.")}
      ${line("We look forward to speaking with you soon.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Your meeting is confirmed - {{company_name}}\n\nHi {{contact_name}},\n\nGreat news! Your meeting with {{employee_name}} from {{company_name}} has been confirmed.\n\nWe look forward to speaking with you soon.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Your meeting is confirmed - {{company_name}}\n\nHi {{contact_name}},\n\nGreat news! Your meeting with {{employee_name}} from {{company_name}} has been confirmed.\n\nWe look forward to speaking with you soon.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Invoice / Payment Reminder",
    subject: "Invoice Reminder from {{company_name}}",
    html: wrapper(
      "Invoice Reminder",
      `${heading("Invoice Reminder", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("This is a friendly reminder that your invoice from {{company_name}} is due soon. Please review the attached invoice and make the payment at your earliest convenience.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Invoice Reminder from {{company_name}}\n\nHi {{contact_name}},\n\nThis is a friendly reminder that your invoice from {{company_name}} is due soon. Please review the attached invoice and make the payment at your earliest convenience.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Invoice Reminder from {{company_name}}\n\nHi {{contact_name}},\n\nThis is a friendly reminder that your invoice from {{company_name}} is due soon. Please review the attached invoice and make the payment at your earliest convenience.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Project Update",
    subject: "Project Update - {{company_name}}",
    html: wrapper(
      "Project Update",
      `${heading("Project Update", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Here&rsquo;s the latest update on your project with {{company_name}}. We&rsquo;re making great progress and will share more details soon.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Project Update - {{company_name}}\n\nHi {{contact_name}},\n\nHere's the latest update on your project with {{company_name}}. We're making great progress and will share more details soon.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Project Update - {{company_name}}\n\nHi {{contact_name}},\n\nHere's the latest update on your project with {{company_name}}. We're making great progress and will share more details soon.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Task Assignment",
    subject: "New task assigned - {{company_name}}",
    html: wrapper(
      "New Task Assigned",
      `${heading("New Task Assigned", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("A new task has been assigned to you by {{employee_name}} from {{company_name}}. Please check your dashboard for details.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `New task assigned - {{company_name}}\n\nHi {{contact_name}},\n\nA new task has been assigned to you by {{employee_name}} from {{company_name}}. Please check your dashboard for details.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `New task assigned - {{company_name}}\n\nHi {{contact_name}},\n\nA new task has been assigned to you by {{employee_name}} from {{company_name}}. Please check your dashboard for details.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Account Created",
    subject: "Your {{company_name}} account is ready",
    html: wrapper(
      "Account Created",
      `${heading("Your account is ready", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Great news! Your {{company_name}} CRM account has been created successfully. You can now log in and start managing your contacts, accounts, and opportunities.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Your {{company_name}} account is ready\n\nHi {{contact_name}},\n\nGreat news! Your {{company_name}} CRM account has been created successfully. You can now log in and start managing your contacts, accounts, and opportunities.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Your {{company_name}} account is ready\n\nHi {{contact_name}},\n\nGreat news! Your {{company_name}} CRM account has been created successfully. You can now log in and start managing your contacts, accounts, and opportunities.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Password Reset",
    subject: "Reset your {{company_name}} password",
    html: wrapper(
      "Password Reset",
      `${heading("Reset your password", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("We received a request to reset your password for your {{company_name}} account. Click the button below to create a new password.")}
      ${btn("Reset Password", "{{company_website}}/v2/login/client")}
      ${line("If you didn&rsquo;t request this, you can safely ignore this email.", "#64748b", "14px", "400")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Reset your {{company_name}} password\n\nHi {{contact_name}},\n\nWe received a request to reset your password for your {{company_name}} account. Click the link below to create a new password.\n\nReset Password: {{company_website}}/v2/login/client\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Reset your {{company_name}} password\n\nHi {{contact_name}},\n\nWe received a request to reset your password for your {{company_name}} account. Click the link below to create a new password.\n\nReset Password: {{company_website}}/v2/login/client\n\nIf you didn't request this, you can safely ignore this email.\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Thank You",
    subject: "Thank you - {{company_name}}",
    html: wrapper(
      "Thank You",
      `${heading("Thank you", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Thank you for choosing {{company_name}}. We appreciate your trust and look forward to serving you.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Thank you - {{company_name}}\n\nHi {{contact_name}},\n\nThank you for choosing {{company_name}}. We appreciate your trust and look forward to serving you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Thank you - {{company_name}}\n\nHi {{contact_name}},\n\nThank you for choosing {{company_name}}. We appreciate your trust and look forward to serving you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Introduction / Cold Outreach",
    subject: "Introduction from {{company_name}}",
    html: wrapper(
      "Introduction from {{company_name}}",
      `${heading("Hello from {{company_name}}", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("I&rsquo;m {{employee_name}} from {{company_name}}. I&rsquo;d love to introduce you to our CRM platform and show you how we can help streamline your sales and customer management.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Introduction from {{company_name}}\n\nHi {{contact_name}},\n\nI'm {{employee_name}} from {{company_name}}. I'd love to introduce you to our CRM platform and show you how we can help streamline your sales and customer management.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Introduction from {{company_name}}\n\nHi {{contact_name}},\n\nI'm {{employee_name}} from {{company_name}}. I'd love to introduce you to our CRM platform and show you how we can help streamline your sales and customer management.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Proposal / Quote",
    subject: "Your proposal from {{company_name}}",
    html: wrapper(
      "Your Proposal",
      `${heading("Your Proposal from {{company_name}}", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Please find attached our proposal for your review. We&rsquo;ve tailored it to meet your specific needs and look forward to discussing the next steps with you.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Your proposal from {{company_name}}\n\nHi {{contact_name}},\n\nPlease find attached our proposal for your review. We've tailored it to meet your specific needs and look forward to discussing the next steps with you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Your proposal from {{company_name}}\n\nHi {{contact_name}},\n\nPlease find attached our proposal for your review. We've tailored it to meet your specific needs and look forward to discussing the next steps with you.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Contract / Agreement",
    subject: "Contract for your review - {{company_name}}",
    html: wrapper(
      "Contract for Review",
      `${heading("Contract for Your Review", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Please find the contract from {{company_name}} attached for your review and signature. Let us know if you have any questions.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `Contract for your review - {{company_name}}\n\nHi {{contact_name}},\n\nPlease find the contract from {{company_name}} attached for your review and signature. Let us know if you have any questions.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `Contract for your review - {{company_name}}\n\nHi {{contact_name}},\n\nPlease find the contract from {{company_name}} attached for your review and signature. Let us know if you have any questions.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Feedback Request",
    subject: "We value your feedback - {{company_name}}",
    html: wrapper(
      "We value your feedback",
      `${heading("We value your feedback", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("At {{company_name}}, we&rsquo;re always looking to improve. Could you take a moment to share your feedback about your experience with us?")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `We value your feedback - {{company_name}}\n\nHi {{contact_name}},\n\nAt {{company_name}}, we're always looking to improve. Could you take a moment to share your feedback about your experience with us?\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `We value your feedback - {{company_name}}\n\nHi {{contact_name}},\n\nAt {{company_name}}, we're always looking to improve. Could you take a moment to share your feedback about your experience with us?\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
  {
    name: "Newsletter / Update",
    subject: "News from {{company_name}}",
    html: wrapper(
      "News from {{company_name}}",
      `${heading("News from {{company_name}}", "28px")}
      ${line("Hi {{contact_name}},", "#334155", "17px", "500")}
      ${line("Here&rsquo;s what&rsquo;s new at {{company_name}}. We&rsquo;ve been working hard to bring you new features and improvements to make your CRM experience even better.")}
      ${btn("Visit Our Website", "{{company_website}}")}
      ${line("Best regards,", "#334155", "15px", "500")}
      ${line("{{employee_name}}<br>{{employee_email}}", "#64748b", "14px", "400")}`,
      `News from {{company_name}}\n\nHi {{contact_name}},\n\nHere's what's new at {{company_name}}. We've been working hard to bring you new features and improvements to make your CRM experience even better.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`
    ),
    text: `News from {{company_name}}\n\nHi {{contact_name}},\n\nHere's what's new at {{company_name}}. We've been working hard to bring you new features and improvements to make your CRM experience even better.\n\nVisit Our Website: {{company_website}}\n\nBest regards,\n{{employee_name}}\n{{employee_email}}`,
    is_default: false,
  },
];
