export const CALL_OUTCOMES = ["RINGING","PITCH_DONE","NOT_INTERESTED","NOT_RELEVANT","LEFT_ORGANIZATION","NOT_AVAILABLE","CONNECTED","NOT_CONNECTED","WRONG_NUMBER","DNC"];
export const ENTRY_KINDS = ["NOTE","EMAIL","MEETING","LINKEDIN"];

export function validateContactEntry(body, now = Date.now()) {
  const { entry_kind, entry_subject, entry_description, entry_occurred_at } = body;
  if (!ENTRY_KINDS.includes(entry_kind)) return { error: "Invalid activity type." };
  const subject = typeof entry_subject === "string" ? entry_subject.trim() : "";
  const description = typeof entry_description === "string" ? entry_description.trim() : "";
  if (!subject || subject.length > 191 || !description || description.length > 10000) return { error: "Enter a subject (up to 191 characters) and notes (up to 10,000 characters)." };
  const occurred = entry_occurred_at ? new Date(entry_occurred_at) : new Date(now);
  if (!Number.isFinite(occurred.getTime()) || occurred.getTime() > now) return { error: "Enter a valid past activity time." };
  return { data: { entry_kind, entry_subject: subject, entry_description: description, entry_occurred_at: occurred } };
}

export function validateFollowup(body) {
  if (!body || typeof body !== "object") return { error: "Invalid follow-up." };
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const due = body.due ? new Date(body.due) : null;
  if (!subject || subject.length > 191 || !due || !Number.isFinite(due.getTime())) return { error: "Enter a follow-up subject and valid due date." };
  if (typeof body.assignee !== "string" || !body.assignee) return { error: "Choose a follow-up assignee." };
  return { data: { task_subject: subject, task_due_date: due, task_user_fk: body.assignee } };
}

export const RELATIONSHIP_STAGES=["NEW","CONTACTED","QUALIFIED","DISQUALIFIED","CUSTOMER"];
export const OPPORTUNITY_STAGES=["PITCH_DONE","FOLLOW_UP","CONTRACT_OUT","CLOSED_WON","CLOSED_LOST"];
export function validateLinkedOpportunity(body) {
  const name=typeof body.opportunity_name==="string"?body.opportunity_name.trim():"";
  const stage=body.opportunity_stage||null;
  const date=body.opportunity_close_date;
  const close=typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+"T00:00:00.000Z"):null;
  if(!name||name.length>191||!close||!Number.isFinite(close.getTime())||close.toISOString().slice(0,10)!==date)return {error:"Enter an opportunity name and valid close date."};
  if(stage!==null&&!OPPORTUNITY_STAGES.includes(stage))return {error:"Invalid opportunity stage."};
  const amount=body.opportunity_value==null?"":String(body.opportunity_value).trim();
  const currency=typeof body.opportunity_currency==="string"?body.opportunity_currency.trim().toUpperCase():"";
  if(amount&&(!/^\d{1,16}(\.\d{1,2})?$/.test(amount)||!/^[A-Z]{3}$/.test(currency)))return {error:"Enter a nonnegative amount and a three-letter currency code."};
  const step=typeof body.opportunity_next_step==="string"?body.opportunity_next_step.trim():"";
  if(step.length>191)return {error:"Next step must be 191 characters or fewer."};
  return {data:{opportunity_name:name,opportunity_stage:stage,opportunity_close_date:close,opportunity_value:amount||null,opportunity_currency:amount?currency:null,opportunity_next_step:step||null}};
}
