import test from "node:test";
import assert from "node:assert/strict";
import { interpolate, htmlToText, emailVars, renderEmail } from "../src/lib/email-render.js";

const contact = {
  contact_firstname: "Asha",
  contact_lastname: "Rao",
  contact_professional_email: "asha@example.com",
};

const sender = { user_name: "Hardik", user_email: "hardik@vsph.in" };

test("interpolate replaces known variables and blanks unknown ones", () => {
  assert.equal(
    interpolate("Hi {{contact_firstname}} from {{company_name}} {{missing}}", {
      contact_firstname: "Asha",
      company_name: "VSPH CRM",
    }),
    "Hi Asha from VSPH CRM "
  );
});

test("email variables fall back to the professional email and build the full name", () => {
  const vars = emailVars({ contact, sender, companyName: "VSPH CRM" });
  assert.equal(vars.contact_name, "Asha Rao");
  assert.equal(vars.contact_email, "asha@example.com");
  assert.equal(vars.employee_name, "Hardik");
  assert.equal(vars.company_name, "VSPH CRM");
});

test("renderEmail resolves per-contact subject, html and text", () => {
  const rendered = renderEmail({
    subject: "Hello {{contact_firstname}}",
    bodyHtml: "<p>Dear {{contact_name}}, welcome to {{company_name}}.</p>",
    contact,
    sender,
    companyName: "VSPH CRM",
  });
  assert.equal(rendered.subject, "Hello Asha");
  assert.match(rendered.html, /Dear Asha Rao, welcome to VSPH CRM/);
  assert.match(rendered.text, /Dear Asha Rao, welcome to VSPH CRM/);
});

test("htmlToText removes tags and keeps readable line breaks", () => {
  assert.equal(htmlToText("<p>One</p><p>Two <b>bold</b></p>"), "One\nTwo bold");
});
