export function present(value) {
  if (value == null) return false;
  const text = String(value).trim();
  return text !== "" && text !== "—" && text !== "-";
}

export function humanize(value, fallback = "Not provided") {
  if (!present(value)) return fallback;
  const text = String(value).replace(/_/g, " ").toLowerCase();
  return text[0].toUpperCase() + text.slice(1);
}

export function contactName(contact) {
  return [contact?.contact_salutation, contact?.contact_firstname, contact?.contact_middlename, contact?.contact_lastname, contact?.contact_suffix].filter(present).join(" ") || "Unnamed contact";
}

export function safeWebLink(value) {
  if (!present(value)) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export const usableEmail = (value) => typeof value === "string" && /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value.trim());
export const emailLink = (value, subject = "", body = "") => usableEmail(value) ? `mailto:${encodeURIComponent(value.trim()).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` : null;
export const phoneLink = (value) => {
  const number = String(value ?? "").trim();
  return /^\+?[\d().\s-]+$/.test(number) && /\d/.test(number) ? `tel:${number.replace(/[^\d+]/g, "")}` : null;
};
export function formatDate(value, dateOnly = false) {
  if (!present(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
export function taskDueDate(date, time) {
  if (!date) return null;
  const result = new Date(`${date}T${time || "12:00"}:00`);
  if (!Number.isFinite(result.getTime())) throw new Error("Enter a valid due date and time.");
  return result.toISOString();
}
export function activityHistory(calls, tasks, filter = "all", options = {}) {
  const items = [];
  if (filter === "all" || filter === "call") {
    for (const record of calls) items.push({ kind: "call", record, date: record.call_created_at });
  }
  if (filter === "all" || filter === "task") {
    for (const record of tasks) items.push({ kind: "task", record, date: record.task_status==="COMPLETED"&&present(record.task_completed_at)&&Number.isFinite(new Date(record.task_completed_at).getTime())?record.task_completed_at:record.task_created_at });
  }
  for (const record of options.entries || []) {
    const kind=record.entry_kind.toLowerCase();
    if(filter==="all"||filter===kind||(filter==="communication"&&kind!=="note"))items.push({kind,record,date:record.entry_occurred_at});
  }
  // Alphabetical ties retain newest-first order, as in the original timeline.
  return selectActivity(items, options, true);
}

// Group by the same local calendar used by the displayed timestamps, not UTC.
// Missing dates stay unknown; the input is already ordered by the selected chronology.
export function groupActivityByDate(items) {
  const groups=new Map();
  for(const item of items) {
    const date=present(item.date) ? new Date(item.date) : null;
    const valid=date && Number.isFinite(date.getTime());
    const key=valid ? [date.getFullYear(),date.getMonth()+1,date.getDate()].map(n=>String(n).padStart(2,"0")).join("-") : "unknown";
    if(!groups.has(key)) groups.set(key,{key,label:valid ? date.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}) : "Date unavailable",items:[]});
    groups.get(key).items.push(item);
  }
  return Array.from(groups.values());
}
export function activityTime(value) {
  if(!present(value))return "Time unavailable";
  const date=new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}) : "Time unavailable";
}

export function filterActivity(items, options = {}) {
  return selectActivity(items, options, false);
}

function selectActivity(items, { query = "", status = "all", priority = "all", sort = "newest", deadline = "all", mine = false, userId, now = Date.now() }, chronologicalTies) {
  const search = query.trim().toLocaleLowerCase();
  const alphabetical = sort === "az" || sort === "za";
  const matching = [];
  for (const item of items) {
    const { kind, record } = item;
    if (kind === "task") {
      if (status !== "all" && record.task_status !== status) continue;
      if (priority !== "all" && record.task_priority !== priority) continue;
      if (deadline !== "all" && taskDeadline(record, now) !== deadline) continue;
      if (mine && (!userId || record.task_user_fk !== userId)) continue;
    } else if (status !== "all" || priority !== "all" || deadline !== "all" || mine) {
      continue;
    }

    const subject = String((kind === "call" ? record.call_subject : kind === "task" ? record.task_subject : record.entry_subject) || "");
    const description = kind === "call" ? record.call_description : kind === "task" ? record.task_description : record.entry_description;
    if (search && !subject.toLocaleLowerCase().includes(search) && !String(description || "").toLocaleLowerCase().includes(search)) continue;

    // Parse each matching record once instead of inside the sort comparator.
    const timestamp = !alphabetical || chronologicalTies
      ? (present(item.date) ? new Date(item.date).getTime() : NaN)
      : NaN;
    matching.push({ item, subject, timestamp: Number.isFinite(timestamp) ? timestamp : null });
  }

  const compareDates = (a, b, oldest = false) => {
    if (a.timestamp === null || b.timestamp === null) {
      if (a.timestamp === b.timestamp) return 0;
      return a.timestamp === null ? 1 : -1;
    }
    return oldest ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
  };

  if (alphabetical) {
    const collator = new Intl.Collator(undefined, { sensitivity: "base" });
    const direction = sort === "za" ? -1 : 1;
    matching.sort((a, b) =>
      direction * collator.compare(a.subject, b.subject) ||
      (chronologicalTies ? compareDates(a, b) : 0)
    );
  } else {
    matching.sort((a, b) => compareDates(a, b, sort === "oldest"));
  }
  return matching.map(entry => entry.item);
}

export function taskDeadline(task, now) {
  if (task.task_status === "COMPLETED") return "completed";
  const due = present(task.task_due_date) ? new Date(task.task_due_date) : null;
  if (!due || !Number.isFinite(due.getTime())) return "unscheduled";
  const today = new Date(now);
  if (due.getTime() < now) return "overdue";
  return due.toDateString() === today.toDateString() ? "today" : "upcoming";
}

export function splitActivity(items) {
  const open = [], past = [];
  for (const item of items) {
    if (item.kind === "task" && item.record.task_status !== "COMPLETED") open.push(item);
    else past.push(item);
  }
  const ranked = open.map(item => {
    const due=present(item.record.task_due_date)?new Date(item.record.task_due_date).getTime():NaN;
    return {item,due:Number.isFinite(due)?due:Infinity};
  });
  ranked.sort((a,b)=>a.due===b.due?0:a.due-b.due);
  return {open:ranked.map(entry=>entry.item),past};
}

export function contactActivitySummary(calls, tasks, now, entries = []) {
  let lastCall = null, nextTask = null, lastInteraction = null;
  for (const call of calls) {
    const time = present(call.call_created_at) ? new Date(call.call_created_at).getTime() : NaN;
    if (Number.isFinite(time) && (!lastCall || time > new Date(lastCall.call_created_at).getTime())) lastCall = call;
  }
  if(lastCall)lastInteraction={kind:"call",date:lastCall.call_created_at};
  for(const entry of entries){
    if(entry.entry_kind==="NOTE")continue;
    const date=entry.entry_occurred_at;
    const time=present(date)?new Date(date).getTime():NaN;
    if(Number.isFinite(time)&&(!lastInteraction||time>new Date(lastInteraction.date).getTime()))lastInteraction={kind:entry.entry_kind.toLowerCase(),date};
  }
  for (const task of tasks) {
    const deadline = taskDeadline(task, now);
    if (deadline === "completed" || deadline === "unscheduled") continue;
    if (!nextTask || new Date(task.task_due_date) < new Date(nextTask.task_due_date)) nextTask = task;
  }
  return { lastCall, nextTask, lastInteraction };
}
