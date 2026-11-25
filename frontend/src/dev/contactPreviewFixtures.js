// Synthetic data and an in-memory API; imported only by the Vite development preview.
export const PREVIEW_USER = Object.freeze({ user_id: "preview-user", user_name: "Arjun Mehta" });
export const PREVIEW_SESSION = Object.freeze({
  vsph_user_id: PREVIEW_USER.user_id,
  vsph_user_name: PREVIEW_USER.user_name,
  vsph_user_email: "admin@northstar.example.com",
  vsph_user_role: "ADMIN",
  vsph_org_role: "ORG_ADMIN",
  vsph_user_owner: "false",
  vsph_profile_timezone: "Asia/Kolkata",
  vsph_avatar_color: "navy",
});
export const PREVIEW_SCENARIOS = Object.freeze([
  { id: "preview-contact-full", label: "Full contact" },
  { id: "preview-contact-sparse", label: "Minimal contact" },
  { id: "preview-contact-long", label: "Long content" },
  { id: "preview-contact-reference", label: "Reference layout" },
]);

const previewUsers=[{...PREVIEW_USER,user_role:"USER",user_status:true,tenant_fk:"preview-tenant"},{user_id:"preview-user-2",user_name:"Maya Rao",user_role:"USER",user_status:true,tenant_fk:"preview-tenant"}];
const copy = value => JSON.parse(JSON.stringify(value));
const account = { account_id: "preview-account-meridian", account_name: "Meridian Hospitality Group", account_email: "contact@meridian.example.com", account_phone: "+1 202-555-0101", account_website: "https://meridian.example.com", account_city: "Mumbai", account_country: "India", account_account_status: "ACTIVE" };
const campaigns = [
  { campaign_id: "preview-campaign-hospitality", campaign_name: "Hospitality Outreach 2026" },
  { campaign_id: "preview-campaign-renewal", campaign_name: "Enterprise Renewal Programme" },
];
const project = { project_id: "preview-project-digital", project_name: "Digital Transformation" };
const industry = { industry_id: "preview-industry-hospitality", industry_name: "Hospitality" };
const common = { contact_owner_fk: PREVIEW_USER.user_id, contact_owner: PREVIEW_USER, contact_status: "ACTIVE" };
const full = {
  ...common, contact_id: PREVIEW_SCENARIOS[0].id, contact_code: "CON-000021",
  contact_salutation: "MS", contact_firstname: "Priya", contact_middlename: "Anjali", contact_lastname: "Kapoor",
  contact_title: "Director", contact_designation: "Director of Operations", contact_role: "Decision maker",
  contact_department: "Operations", contact_partner_name: "Northstar Technologies", contact_reportsto: "Managing Director",
  contact_professional_email: "priya.kapoor@meridian.example.com", contact_personal_email: "priya@example.org",
  contact_phone: "+1 202-555-0102", contact_mobile: "+1 202-555-0103", contact_alternate_number: "+1 202-555-0104",
  contact_landline_number: "+1 202-555-0105", contact_fax_number: "+1 202-555-0106",
  contact_profile_link: "https://example.com/profile/priya", contact_navigator_link: "https://example.com/sales/priya",
  contact_account_fk: account.account_id, account: { account_name: account.account_name },
  contact_industry_fk: industry.industry_id, contact_industry: industry,
  contact_project_fk: project.project_id, contact_project: project,
  contact_campaign_fk: campaigns[0].campaign_id, contact_campaign: campaigns[0],
  contact_call_status: "CONNECTED", contact_email_status: "VALID", contact_phone_status: "VALID",
  contact_segment: "Enterprise", contact_level_field: "Senior management", contact_tpid: "TPID-2026-001", contact_employee_size: "250",
  contact_city: "Mumbai", contact_state: "Maharashtra", contact_country: "India",
  contact_account_billing_address: [{ billing_street: "101 Example Business Park", billing_city: "Mumbai", billing_state: "Maharashtra", billing_zip: "400051", billing_country: "India" }],
  contact_account_shipping_address: [{ shipping_street: "205 Example Corporate Avenue", shipping_city: "Pune", shipping_state: "Maharashtra", shipping_zip: "411057", shipping_country: "India" }],
  contact_pickup_date: "2026-11-30T00:00:00.000Z", contact_pickup_time: "10:00", contact_pickup_location: "Mumbai Airport",
  contact_drop_date: "2026-11-30T00:00:00.000Z", contact_drop_time: "11:30", contact_drop_location: "Meridian Corporate Office",
  opportunities: [
    { opportunity_id: "preview-opportunity-1", opportunity_name: "Enterprise CRM Implementation", opportunity_stage: "CONTRACT_OUT", opportunity_close_date: "2026-12-31T00:00:00.000Z" },
    { opportunity_id: "preview-opportunity-2", opportunity_name: "Customer Experience Analytics", opportunity_stage: "FOLLOW_UP", opportunity_close_date: "2027-01-15T00:00:00.000Z" },
  ],
};
const sparse = { ...common, contact_id: PREVIEW_SCENARIOS[1].id, contact_code: "CON-000022", contact_firstname: "Neel", contact_lastname: "Shah", opportunities: [] };
const reference = { ...common, contact_id: PREVIEW_SCENARIOS[3].id, contact_code: "CON-000003", contact_firstname: "Rakesh", contact_lastname: "Sharma", contact_professional_email: "rakesh@example.com", contact_call_status: "CONNECTED", opportunities: [] };
const long = {
  ...full, contact_id: PREVIEW_SCENARIOS[2].id, contact_code: "CON-000023",
  contact_salutation: "DR", contact_firstname: "Alexandria", contact_middlename: "Marie Elizabeth", contact_lastname: "Montgomery-Richardson",
  contact_designation: "Executive Vice President of International Operations and Strategic Partnerships",
  contact_professional_email: "alexandria.montgomery-richardson.international.operations@meridian.example.com",
  contact_profile_link: "https://example.com/people/alexandria-montgomery-richardson/international-operations-and-strategic-partnerships",
  contact_call_status: "PITCH_DONE", opportunities: [{ opportunity_id: "preview-opportunity-3", opportunity_name: "Multi-region Operational Intelligence and Customer Relationship Management Modernization", opportunity_stage: "CONTRACT_OUT" }],
};
const seedCalls = [
  { call_id: "preview-call-1", call_contact_fk: full.contact_id, call_subject: "Initial discovery call", call_description: "Discussed operational challenges, CRM requirements and integration with hospitality management systems. The client requested a technical proposal.", call_created_at: "2026-11-23T05:15:00.000Z", user: PREVIEW_USER },
  { call_id: "preview-call-2", call_contact_fk: full.contact_id, call_subject: "Technical requirements follow-up", call_description: "Confirmed role-based access, reporting dashboards and centralized customer data. Budget approval is pending.", call_created_at: "2026-11-24T05:12:00.000Z", user: PREVIEW_USER },
  ...Array.from({length: 8}, (_, index) => ({ call_id: "preview-long-call-"+index, call_contact_fk: long.contact_id, call_subject: "Stakeholder alignment and implementation discussion "+(index+1), call_description: "Reviewed regional operational requirements, integration dependencies, reporting ownership and stakeholder feedback. Documented next steps and confirmed the implementation plan. ".repeat(index%3+1).trim(), call_created_at: new Date(Date.UTC(2026,10,16+index,9)).toISOString(), user: PREVIEW_USER })),
];
const seedTasks = [
  { task_id: "preview-task-1", task_user_fk: PREVIEW_USER.user_id, task_progress: 0, task_updates: [], task_contact_fk: full.contact_id, task_subject: "Prepare technical proposal", task_description: "Prepare architecture, implementation milestones and estimated project costs.", task_priority: "HIGH", task_status: "IN_PROGRESS", task_due_date: "2026-11-27T05:30:00.000Z", task_created_at: "2026-11-23T06:20:00.000Z", user: PREVIEW_USER },
  { task_id: "preview-task-2", task_user_fk: PREVIEW_USER.user_id, task_progress: 0, task_updates: [], task_contact_fk: full.contact_id, task_subject: "Schedule product demonstration", task_description: "Arrange a demonstration for the operations and IT teams.", task_priority: "NORMAL", task_status: "TODO", task_due_date: "2026-11-30T08:30:00.000Z", task_created_at: "2026-11-24T06:00:00.000Z", user: PREVIEW_USER },
  { task_id: "preview-task-3", task_user_fk: PREVIEW_USER.user_id, task_progress: 0, task_updates: [], task_contact_fk: long.contact_id, task_subject: "Consolidate regional stakeholder feedback and finalize delivery roadmap", task_description: "Summarize requirements and identify unresolved dependencies.", task_priority: "LOW", task_status: "TODO", task_created_at: "2026-11-24T07:00:00.000Z", user: PREVIEW_USER },
];

const ok = data => ({ success:true, data });
const fail = message => ({ success:false, message });
function parseEndpoint(endpoint) {
  const [path, query = ""] = endpoint.split("?", 2);
  // Fixtures accept the relative API paths used by the actual CRM client, never external URLs.
  if (!path.startsWith("/api/") || path.includes("#")) throw new Error("Unsupported preview endpoint");
  const params = {};
  for (const pair of query.split("&").filter(Boolean)) {
    const [key, value=""] = pair.split("=",2);
    params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g," "));
  }
  return {path,params};
}
function paginate(records,params) {
  const limit = Math.max(1, Math.min(1000, Number(params.limit)||20));
  const page = Math.max(1, Number(params.page)||1);
  return { success:true, data:records.slice((page-1)*limit,page*limit), pagination:{ totalRecords:records.length,currentPage:page,totalPages:Math.ceil(records.length/limit) } };
}
function addresses(payload, prefix, previous=[]) {
  const fields = Object.fromEntries(Object.entries(payload).filter(([key])=>key.startsWith(prefix+"_")));
  return Object.keys(fields).length ? [{...(previous[0]||{}),...fields}] : previous;
}

export function createContactPreviewStore({ now = () => new Date().toISOString() } = {}) {
  let contacts, calls, tasks, entries, serial, failNext, delay, generation;
  generation = 0;
  function reset() {
    contacts = copy([full,sparse,long,reference]); calls = copy(seedCalls); tasks = copy(seedTasks); entries=[];
    serial = 0; failNext = false; delay = 250; generation++;
  }
  reset();
  const id = kind => "preview-"+kind+"-new-"+(++serial);
  const matches = (row, query) => [row.contact_firstname,row.contact_middlename,row.contact_lastname,row.contact_code,row.contact_professional_email,row.account?.account_name].filter(Boolean).join(" ").toLowerCase().includes(query);
  const contactById = key => contacts.find(c=>c.contact_id===key);
  function materialize(payload, previous = {}) {
    // Restrict record fields to the editable contact payload; derive linked record objects separately.
    const fields = Object.fromEntries(Object.entries(payload).filter(([key]) => key.startsWith("contact_") && !["contact_id","contact_code","contact_owner","contact_campaign","contact_project","contact_industry","contact_account_billing_address","contact_account_shipping_address"].includes(key)));
    const result = {...previous,...fields};
    return {
      ...result,
      account: result.contact_account_fk === account.account_id ? {account_name:account.account_name} : null,
      contact_campaign: campaigns.find(c=>c.campaign_id===result.contact_campaign_fk)||null,
      contact_project: result.contact_project_fk===project.project_id ? project : null,
      contact_industry: result.contact_industry_fk===industry.industry_id || result.contact_industry_fk===industry.industry_name ? industry : result.contact_industry_fk ? {industry_name:result.contact_industry_fk} : null,
      contact_owner_fk: PREVIEW_USER.user_id, contact_owner:PREVIEW_USER,
      contact_account_billing_address:addresses(payload,"billing",previous.contact_account_billing_address),
      contact_account_shipping_address:addresses(payload,"shipping",previous.contact_account_shipping_address),
      opportunities:previous.opportunities||[],
    };
  }
  function dispatch(method,endpoint,payload={}) {
    const {path,params} = parseEndpoint(endpoint);
    const query = String(params.search||params.q||"").toLowerCase();
    const opportunityRoute=/^\/api\/contacts\/([^/]+)\/opportunities(?:\/([^/]+))?$/.exec(path);
    const relationshipRoute=/^\/api\/contacts\/([^/]+)\/relationship$/.exec(path);
    const entryRoute = /^\/api\/contacts\/([^/]+)\/activities(?:\/([^/]+))?$/.exec(path);
    const entryContact=entryRoute?contactById(decodeURIComponent(entryRoute[1])):null;
    const contactRoute = /^\/api\/contacts\/([^/]+)$/.exec(path);
    const contact = contactRoute ? contactById(decodeURIComponent(contactRoute[1])) : null;
    const taskRoute = /^\/api\/tasks\/([^/]+)$/.exec(path);
    const task = taskRoute ? tasks.find(t=>t.task_id===decodeURIComponent(taskRoute[1])) : null;
    if (method!=="GET" && failNext) { failNext=false; return fail("Simulated preview failure. Your data was not changed."); }
    if (method==="GET") {
      if(path==="/api/email-templates")return ok([{email_template_id:"preview-template",name:"Follow-up",subject:"Hello {{contact_firstname}}",body_text:"Thank you, {{contact_firstname}}.",body_html:"<p>Thank you, {{contact_firstname}}.</p>"}]);
      if(entryRoute)return entryContact?paginate(entries.filter(e=>e.contact_fk===entryContact.contact_id&&!e.entry_deleted_at),params):fail("Contact not found");
      if (path==="/api/contacts") return paginate(contacts.filter(c=>matches(c,query)),params);
      if (contactRoute) return contact ? ok(contact) : fail("Contact not found");
      if (path==="/api/calls") return calls.filter(c=>!params.contact_id||c.call_contact_fk===params.contact_id).sort((a,b)=>b.call_created_at.localeCompare(a.call_created_at));
      if (taskRoute) return task ? ok(task) : fail("Task not found");
      if (path==="/api/tasks") return paginate(tasks.filter(t=>!params.contact_id||t.task_contact_fk===params.contact_id).sort((a,b)=>b.task_created_at.localeCompare(a.task_created_at)).map(t=>Object.fromEntries(Object.entries(t).filter(([key])=>key!=="task_updates"))),params);
      if (path==="/api/users") return ok(previewUsers);
      if (path==="/api/accounts") return paginate([account],params);
      if (path==="/api/campaigns") return paginate(campaigns,params);
      if (path==="/api/projects") return paginate([project],params);
      if (path==="/api/search") return contacts.filter(c=>matches(c,query)).map(c=>({type:"contact",id:c.contact_id,title:[c.contact_firstname,c.contact_lastname].filter(Boolean).join(" "),subtitle:c.account?.account_name||c.contact_code}));
    }
    if(method==="POST"&&path==="/api/emails/send"){if(!payload.to||(!payload.template_id&&(!payload.subject?.trim()||!payload.body?.trim())))return fail("Invalid email.");return {success:true,message:"Simulated email sent; no external request."};}
    if (method==="POST" && path==="/api/contacts") {
      if (!String(payload.contact_firstname||"").trim()||!String(payload.contact_lastname||"").trim()) return fail("First and last name are required.");
      const record = {...materialize(payload),contact_id:id("contact"),contact_code:"CON-PREVIEW-"+String(serial).padStart(3,"0")};
      contacts.push(record); return ok(record);
    }
    if (method==="PUT" && contactRoute) {
      if (!contact) return fail("Contact not found");
      const next = materialize(payload,contact);
      if (!String(next.contact_firstname||"").trim()||!String(next.contact_lastname||"").trim()) return fail("First and last name are required.");
      contacts = contacts.map(c=>c===contact?next:c); return {success:true,message:"Contact updated successfully"};
    }
    if (method==="DELETE" && contactRoute) {
      if (!contact) return fail("Contact not found");
      contacts=contacts.filter(c=>c!==contact); calls=calls.filter(c=>c.call_contact_fk!==contact.contact_id); tasks=tasks.filter(t=>t.task_contact_fk!==contact.contact_id);
      return {success:true,message:"Contact deleted"};
    }
    if(method==="PATCH"&&relationshipRoute){
      const contact=contactById(decodeURIComponent(relationshipRoute[1]));
      const stage=payload.contact_relationship_stage;
      if(!contact||(stage!==null&&!["NEW","CONTACTED","QUALIFIED","DISQUALIFIED","CUSTOMER"].includes(stage)))return fail("Invalid relationship.");
      contact.contact_relationship_stage=stage;return ok({contact_relationship_stage:stage});
    }
    if(opportunityRoute&&(method==="POST"||method==="PATCH")){
      const contact=contactById(decodeURIComponent(opportunityRoute[1]));
      if(!contact||!payload.opportunity_name?.trim()||!payload.opportunity_close_date)return fail("Invalid opportunity.");
      const existing=opportunityRoute[2]&&contact.opportunities.find(o=>o.opportunity_id===decodeURIComponent(opportunityRoute[2]));
      if(method==="PATCH"&&!existing)return fail("Linked opportunity not found.");
      const record={...existing,...payload,opportunity_id:existing?.opportunity_id||id("opportunity"),opportunity_owner:existing?.opportunity_owner||PREVIEW_USER,opportunity_close_date:new Date(payload.opportunity_close_date).toISOString(),opportunity_value:payload.opportunity_value===""?null:payload.opportunity_value,opportunity_currency:payload.opportunity_value===""?null:payload.opportunity_currency};
      contact.opportunities=[record,...contact.opportunities.filter(o=>o.opportunity_id!==record.opportunity_id)];return ok(record);
    }
    if(entryRoute?.[2]&&(method==="PATCH"||method==="DELETE")){
      const record=entries.find(e=>e.entry_id===decodeURIComponent(entryRoute[2])&&e.contact_fk===entryContact?.contact_id&&!e.entry_deleted_at);
      if(!record)return fail("Activity not found.");
      if(method==="PATCH"&&(payload.entry_revision!==record.entry_revision||!payload.entry_subject?.trim()||!payload.entry_description?.trim()||!Number.isFinite(new Date(payload.entry_occurred_at).getTime())||new Date(payload.entry_occurred_at)>new Date(now())))return fail("Invalid or stale activity correction.");
      const snapshot={action:method==="DELETE"?"DELETE":"EDIT",actor:PREVIEW_USER.user_id,at:now(),previous:{subject:record.entry_subject,description:record.entry_description,occurred:record.entry_occurred_at,revision:record.entry_revision}};
      record.entry_audit=[...(record.entry_audit||[]),snapshot];record.entry_revision++;
      if(method==="DELETE"){record.entry_deleted_at=now();return ok(null);}
      Object.assign(record,{entry_subject:payload.entry_subject.trim(),entry_description:payload.entry_description.trim(),entry_occurred_at:payload.entry_occurred_at});return ok(record);
    }
    if(method==="POST"&&entryRoute&&!entryRoute[2]){
      if(!entryContact||!["NOTE","EMAIL","MEETING","LINKEDIN"].includes(payload.entry_kind)||!payload.entry_subject?.trim()||!payload.entry_description?.trim()||(payload.entry_occurred_at&&(!Number.isFinite(new Date(payload.entry_occurred_at).getTime())||new Date(payload.entry_occurred_at)>new Date(now()))))return fail("Invalid activity.");
      const record={...payload,entry_id:id("entry"),contact_fk:entryContact.contact_id,entry_occurred_at:payload.entry_occurred_at||now(),entry_created_at:now(),entry_revision:0,user:PREVIEW_USER};entries.push(record);return ok(record);
    }
    if (method==="POST" && path==="/api/calls") {
      if (!contactById(payload.call_contact_fk)||!String(payload.call_subject||"").trim()||!String(payload.call_description||"").trim()) return fail("Contact, subject and notes are required.");
      const {followup,mark_do_not_call,...callData}=payload;
      if(mark_do_not_call&&payload.call_outcome!=="DNC")return fail("DNC outcome required.");
      const assignee=followup&&previewUsers.find(u=>u.user_id===followup.assignee);
      if(followup&&(!assignee||!followup.subject?.trim()||!followup.due||!Number.isFinite(new Date(followup.due).getTime())))return fail("Invalid follow-up.");
      const record={...callData,call_id:id("call"),call_user_fk:PREVIEW_USER.user_id,call_created_at:now(),user:PREVIEW_USER};
      if(mark_do_not_call)contactById(payload.call_contact_fk).contact_call_status="DNC";
      if(!followup){calls.push(record);return record;}
      const task={task_id:id("task"),task_contact_fk:payload.call_contact_fk,task_call_fk:record.call_id,task_assigned_by_fk:PREVIEW_USER.user_id,task_user_fk:assignee.user_id,task_subject:followup.subject,task_due_date:followup.due,task_status:"TODO",task_priority:"NORMAL",task_created_at:now(),user:assignee,task_updates:[]};calls.push(record);tasks.push(task);return {...record,followup_task:task};
    }
    if (method==="POST" && path==="/api/tasks") {
      if (!contactById(payload.task_contact_fk)||!String(payload.task_subject||"").trim()||!["LOW","NORMAL","HIGH"].includes(payload.task_priority)) return fail("Contact, subject and valid priority are required.");
      const assignee=payload.task_user_fk?previewUsers.find(user=>user.user_id===payload.task_user_fk):PREVIEW_USER;
      if(!assignee)return fail("Assignee not found.");
      const record={...payload,task_id:id("task"),task_assigned_by_fk:PREVIEW_USER.user_id,task_user_fk:assignee.user_id,task_status:"TODO",task_progress:0,task_completed_at:null,task_updates:[],task_created_at:now(),user:assignee}; tasks.push(record); return {success:true,message:"Task created",...record};
    }
    if ((method==="PATCH" || method==="PUT") && taskRoute) {
      if(!task)return fail("Task not found");
      const status=payload.task_status??task.task_status;
      const fields=["task_status","task_subject","task_description","task_priority","task_due_date","task_user_fk"];
      if(!["TODO","IN_PROGRESS","BLOCKED","COMPLETED"].includes(status)||Object.keys(payload).some(key=>!fields.includes(key)))return fail("Invalid preview task patch.");
      if(payload.task_subject!==undefined&&!String(payload.task_subject).trim())return fail("Task subject is required.");
      if(payload.task_priority!==undefined&&!["LOW","NORMAL","HIGH"].includes(payload.task_priority))return fail("Invalid task priority.");
      if(payload.task_due_date!=null&&!Number.isFinite(new Date(payload.task_due_date).getTime()))return fail("Invalid due date.");
      const assignee=payload.task_user_fk===undefined?task.user:previewUsers.find(user=>user.user_id===payload.task_user_fk);
      if(!assignee)return fail("Assignee not found.");
      const changed=status!==task.task_status;
      const updated={...task,...payload,user:assignee,task_status:status,task_completed_at:status==="COMPLETED" ? task.task_completed_at || now() : null,
        task_updates:changed ? [{previous_status:task.task_status,new_status:status,previous_progress:task.task_progress,new_progress:task.task_progress,created_at:now(),user:PREVIEW_USER},...(task.task_updates||[])] : task.task_updates||[]};
      tasks=tasks.map(t=>t===task?updated:t);
      return {success:true,message:"Task updated",...updated,data:updated};
    }
    return fail("This API is outside the contact preview: "+method+" "+path);
  }
  return {
    reset,
    setDelay(ms) { delay = ms; },
    failNextWrite() { failNext = true; },
    // Capture the generation so a reset cannot be undone by an old in-flight request.
    async request(method,endpoint,payload) {
      const requestedGeneration = generation;
      if (delay) await new Promise(resolve=>setTimeout(resolve,delay));
      if (requestedGeneration!==generation) return fail("Preview data was reset.");
      return copy(dispatch(method,endpoint,payload));
    },
  };
}
