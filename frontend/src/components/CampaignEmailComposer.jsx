import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, Loader2, Mail, Plus, Paperclip, Send, X } from "lucide-react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import { api } from "../utils/api";
import toast from "react-hot-toast";

const STORAGE_KEY_TEMPLATE = "campaign_email_last_template";
const STORAGE_KEY_SENDER = "campaign_email_last_sender";
const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_MB = 10;

const VARIABLES = [
  "{{contact_firstname}}",
  "{{contact_lastname}}",
  "{{contact_name}}",
  "{{contact_email}}",
  "{{employee_name}}",
  "{{employee_email}}",
  "{{company_name}}",
  "{{company_tagline}}",
  "{{company_website}}",
  "{{current_date}}",
];

const EMPTY_TEMPLATE = { name: "", subject: "", body_html: "" };

// Module-level cache so reopening the composer doesn't refetch the same data.
const cache = {
  templates: null,
  senders: null,
  recipients: null,
};

const CampaignEmailComposer = ({ isOpen, onClose, onSent }) => {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [senders, setSenders] = useState([]);
  const [senderEmail, setSenderEmail] = useState("");

  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [skipped, setSkipped] = useState(0);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Restore last-used template and sender.
    try {
      const savedTemplate = localStorage.getItem(STORAGE_KEY_TEMPLATE);
      const savedSender = localStorage.getItem(STORAGE_KEY_SENDER);
      if (savedTemplate) setTemplateId(savedTemplate);
      if (savedSender) setSenderEmail(savedSender);
    } catch {
      // localStorage may be unavailable in private mode; ignore.
    }
    let cancelled = false;

    (async () => {
      // Use cache if available, otherwise fetch.
      if (cache.templates) {
        setTemplates(cache.templates);
      } else {
        const templateResult = await api.get("/api/email-templates");
        if (cancelled) return;
        if (templateResult.success) {
          cache.templates = templateResult.data || [];
          setTemplates(cache.templates);
        }
      }
      if (cache.senders) {
        setSenders(cache.senders);
        setSenderEmail((current) => current || cache.senders?.[0]?.email || "");
      } else {
        const senderResult = await api.get("/api/campaigns/email-senders");
        if (cancelled) return;
        if (senderResult.success) {
          cache.senders = senderResult.data || [];
          setSenders(cache.senders);
          setSenderEmail((current) => current || cache.senders?.[0]?.email || "");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const persistTemplate = useCallback((id) => {
    setTemplateId(id);
    try { localStorage.setItem(STORAGE_KEY_TEMPLATE, id || ""); } catch { /* ignore */ }
  }, []);

  const persistSender = useCallback((email) => {
    setSenderEmail(email);
    try { localStorage.setItem(STORAGE_KEY_SENDER, email || ""); } catch { /* ignore */ }
  }, []);

  const applyTemplate = (id) => {
    persistTemplate(id);
    const template = templates.find((item) => item.email_template_id === id);
    if (template) {
      setSubject(template.subject || "");
      setBodyHtml(template.body_html || "");
    }
  };

  const saveTemplate = async (event) => {
    event.preventDefault();
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body_html.trim()) {
      toast.error("Template name, subject and body are required.");
      return;
    }

    setSavingTemplate(true);
    try {
      const result = await api.post("/api/email-templates", templateForm);
      if (!result.success) throw new Error(result.message || "Could not create the template.");
      const created = result.data;
      setTemplates((current) => [...current, created]);
      setTemplateId(created.email_template_id);
      setSubject(created.subject || "");
      setBodyHtml(created.body_html || "");
      setTemplateForm(EMPTY_TEMPLATE);
      setShowTemplateForm(false);
      toast.success("Template created.");
    } catch (err) {
      toast.error(err.message || "Could not create the template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const openPreview = async () => {
    setError("");
    setPreview({});
    setPreviewLoading(true);
    try {
      const result = await api.post("/api/campaigns/emails/preview", {
        subject,
        body_html: bodyHtml,
      });
      if (!result.success) throw new Error(result.message || "Could not build the preview.");
      setPreview(result.data);
    } catch (err) {
      setPreview(null);
      setError(err.message || "Could not build the preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const openRecipients = async () => {
    setError("");
    setRecipientsOpen(true);
    setSelected(new Set());
    setRecipientSearch("");
    setRecipientsLoading(true);
    try {
      // Use cache if available.
      if (cache.recipients) {
        setRecipients(cache.recipients.data || []);
        setSkipped(cache.recipients.skipped || 0);
        setRecipientsLoading(false);
      } else {
        const result = await api.get("/api/campaigns/email-recipients");
        if (!result.success) throw new Error(result.message || "Could not load contacts.");
        cache.recipients = result;
        setRecipients(result.data || []);
        setSkipped(result.skipped || 0);
      }
    } catch (err) {
      setRecipients([]);
      setError(err.message || "Could not load contacts.");
    } finally {
      setRecipientsLoading(false);
    }
  };

  const visibleRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    if (!query) return recipients;
    return recipients.filter((recipient) =>
      [recipient.name, recipient.email, recipient.account_name, recipient.industry]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [recipients, recipientSearch]);

  const allVisibleSelected =
    visibleRecipients.length > 0 && visibleRecipients.every((recipient) => selected.has(recipient.contact_id));

  const toggleAllVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleRecipients.forEach((recipient) => next.delete(recipient.contact_id));
      else visibleRecipients.forEach((recipient) => next.add(recipient.contact_id));
      return next;
    });
  };

  const toggleRecipient = (id) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const readFileAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });

  const addAttachments = async (files) => {
    const next = [...attachments];
    for (const file of files) {
      if (next.length >= MAX_ATTACHMENTS) break;
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_ATTACHMENT_MB} MB and was skipped.`);
        continue;
      }
      const base64 = await readFileAsBase64(file);
      next.push({ name: file.name, type: file.type, size: file.size, base64 });
    }
    setAttachments(next);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeAttachment = (name) => {
    setAttachments(attachments.filter((a) => a.name !== name));
  };

  const attachmentPayload = () =>
    attachments.map((a) => ({
      filename: a.name,
      content: a.base64,
      content_type: a.type,
    }));

  const sendEmail = async () => {
    if (!selected.size) return;
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    setError("");
    try {
      const result = await api.post("/api/campaigns/emails/send", {
        subject,
        body_html: bodyHtml,
        template_id: templateId || undefined,
        sender_email: senderEmail,
        contact_ids: [...selected],
        attachments: attachments.length ? attachmentPayload() : undefined,
      });
      if (!result.success) throw new Error(result.message || "Could not send the email.");
      toast.success(result.message || "Email sent.");
      setRecipientsOpen(false);
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message || "Could not send the email.");
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async () => {
    if (!senderEmail) return;
    setTestSending(true);
    setError("");
    try {
      const result = await api.post("/api/campaigns/emails/test", {
        subject,
        body_html: bodyHtml,
        sender_email: senderEmail,
        attachments: attachments.length ? attachmentPayload() : undefined,
      });
      if (!result.success) throw new Error(result.message || "Could not send the test email.");
      toast.success(result.message || "Test email sent.");
    } catch (err) {
      setError(err.message || "Could not send the test email.");
    } finally {
      setTestSending(false);
    }
  };

  const canPreview = Boolean(subject.trim() && bodyHtml.trim());
  const canSend = canPreview && Boolean(senderEmail);
  const multiTenantSenders = new Set(senders.map((sender) => sender.tenant_fk)).size > 1;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Send email"
        widthClass="w-full max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={sending || testSending}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={openPreview} disabled={!canPreview || previewLoading || testSending}>
              {previewLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Eye size={16} className="mr-2" />}
              Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={sendTestEmail}
              disabled={!canSend || testSending}
            >
              {testSending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Mail size={14} className="mr-2" />}
              {testSending ? "Sending test…" : "Send test to myself"}
            </Button>
            <Button onClick={openRecipients} disabled={!canSend || sending || testSending}>
              <Mail size={16} className="mr-2" /> Send email
            </Button>
          </>
        }
      >
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-100">{error}</div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-vsph-navy">1. Template</h3>
              <button
                type="button"
                onClick={() => setShowTemplateForm((open) => !open)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-vsph-core-blue hover:underline"
              >
                <Plus size={14} /> Create new template
              </button>
            </div>

            <select
              value={templateId}
              onChange={(event) => applyTemplate(event.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vsph-core-blue"
            >
              <option value="">No template — write from scratch</option>
              {templates.map((template) => (
                <option key={template.email_template_id} value={template.email_template_id}>
                  {template.name}
                </option>
              ))}
            </select>

            {showTemplateForm && (
              <form onSubmit={saveTemplate} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-vsph-grey">
                <input
                  value={templateForm.name}
                  onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })}
                  placeholder="Template name"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
                />
                <input
                  value={templateForm.subject}
                  onChange={(event) => setTemplateForm({ ...templateForm, subject: event.target.value })}
                  placeholder="Subject"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
                />
                <textarea
                  value={templateForm.body_html}
                  onChange={(event) => setTemplateForm({ ...templateForm, body_html: event.target.value })}
                  placeholder="HTML body"
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs font-mono bg-white"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowTemplateForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingTemplate}>
                    {savingTemplate ? "Saving..." : "Save template"}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-vsph-navy">2. Draft</h3>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vsph-core-blue"
            />
            <textarea
              value={bodyHtml}
              onChange={(event) => setBodyHtml(event.target.value)}
              placeholder="Write your email. HTML is supported."
              rows={10}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vsph-core-blue"
            />
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => setBodyHtml((current) => `${current}${variable}`)}
                  className="px-2 py-1 rounded border border-slate-200 text-[11px] text-slate-600 hover:bg-vsph-grey"
                >
                  {variable}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Send from</label>
              <select
                value={senderEmail}
                onChange={(event) => persistSender(event.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vsph-core-blue"
              >
                {senders.length === 0 && <option value="">No verified sender available</option>}
                {senders.map((sender) => (
                  <option key={sender.email} value={sender.email}>
                    {sender.name} &lt;{sender.email}&gt;
                    {multiTenantSenders && sender.tenant_name ? ` · ${sender.tenant_name}` : ""}
                  </option>
                ))}
              </select>
              {senders.length === 0 && (
                <p className="mt-1 text-xs text-rose-600">
                  Your email domain is not verified for sending. Ask an administrator to verify it in Resend.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Attachments</label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  onChange={(event) => {
                    if (event.target.files) addAttachments(Array.from(event.target.files));
                  }}
                  className="sr-only"
                />
                <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={sending || testSending}>
                  <Paperclip size={14} className="mr-2" /> Attach files
                </Button>
                <span className="text-xs text-slate-500">
                  {attachments.length}/{MAX_ATTACHMENTS} · max {MAX_ATTACHMENT_MB} MB each
                </span>
              </div>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.name}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-[11px] text-slate-600 bg-vsph-grey"
                    >
                      {attachment.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.name)}
                        className="ml-1 hover:text-vsph-core-blue"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Email preview"
        widthClass="w-full max-w-3xl"
      >
        <div className="p-6 space-y-4">
          {previewLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Building preview...
            </div>
          ) : preview ? (
            <>
              <div className="text-sm font-semibold text-vsph-navy">{preview.subject}</div>
              <iframe
                title="Email preview"
                srcDoc={preview.html}
                sandbox=""
                className="w-full h-[60vh] border border-slate-200 rounded-lg bg-white"
              />
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-vsph-core-blue">Plain-text version</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{preview.text}</pre>
              </details>
            </>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={recipientsOpen}
        onClose={() => setRecipientsOpen(false)}
        title="Choose contacts"
        widthClass="w-full max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRecipientsOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={!selected.size || sending}>
              {sending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
              {sending ? "Sending..." : `Send to ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-100">{error}</div>
          )}

          <div className="flex items-center justify-between gap-3">
            <input
              value={recipientSearch}
              onChange={(event) => setRecipientSearch(event.target.value)}
              placeholder="Search name, email or account..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">{selected.size} selected</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-vsph-navy">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleAllVisible}
              disabled={!visibleRecipients.length}
              className="rounded border-slate-300 text-vsph-core-blue focus:ring-vsph-core-blue"
            />
            Select all shown ({visibleRecipients.length})
          </label>

          <div className="max-h-[45vh] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {recipientsLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" /> Loading contacts...
              </div>
            ) : visibleRecipients.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No contacts with an email address.</p>
            ) : (
              visibleRecipients.map((recipient) => (
                <label
                  key={recipient.contact_id}
                  className="flex items-center gap-3 p-3 hover:bg-vsph-grey/60 cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={selected.has(recipient.contact_id)}
                      onChange={() => toggleRecipient(recipient.contact_id)}
                      className="rounded border-slate-300 text-vsph-core-blue focus:ring-vsph-core-blue"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-vsph-navy truncate">
                      {recipient.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {recipient.email}
                      {recipient.account_name ? ` · ${recipient.account_name}` : ""}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>

          {skipped > 0 && (
            <p className="text-xs text-slate-500">
              {skipped} contact{skipped === 1 ? "" : "s"} without an email address are not listed.
            </p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm send"
        widthClass="w-full max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={confirmSend} disabled={sending}>
              {sending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
              {sending ? "Sending…" : `Send to ${selected.size} contact${selected.size === 1 ? "" : "s"}`}
            </Button>
          </>
        }
      >
        <div className="p-6 space-y-4">
          <div className="text-sm font-medium text-vsph-navy">
            Send this email to <span className="font-semibold">{selected.size}</span>{" "}
            {selected.size === 1 ? "contact" : "contacts"}?
          </div>
          <div className="grid gap-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Subject:</span>
              <span className="truncate text-vsph-navy">{subject || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>From:</span>
              <span className="truncate">{senderEmail}</span>
            </div>
            <div className="flex justify-between">
              <span>Template:</span>
              <span className="truncate">
                {templates.find((t) => t.email_template_id === templateId)?.name || "None (custom draft)"}
              </span>
            </div>
            {attachments.length > 0 && (
              <div className="flex justify-between">
                <span>Attachments:</span>
                <span className="truncate">{attachments.map((a) => a.name).join(", ")}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            This cannot be undone. Sending to {selected.size} contact{selected.size === 1 ? "" : "s"} will create a
            send-history record with per-recipient results.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default CampaignEmailComposer;
