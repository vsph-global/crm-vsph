import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

test("contact release: authorization, atomic follow-ups, DNC, corrections and commercial records", {skip:process.env.RUN_DB_TESTS!=="1"}, async()=>{
  // Refuse to create test data in any other database, even if opted in.
  assert.equal(process.env.DATABASE_NAME,"crm_release_test");
  assert.equal(new URL(process.env.DATABASE_URL).pathname,"/crm_release_test");
  const { prisma }=await import("../src/lib/prisma.js");
  const { app }=await import("../src/server.js");
  const { hashPassword }=await import("../src/lib/passwords.js");
  const { signSessionToken }=await import("../src/lib/session.js");
  const stamp=randomUUID().replaceAll("-","").slice(0,16);
  const tenants=[];
  let server;
  try{
    const tenant=async suffix=>{
      const result=await prisma.tenant.create({data:{tenant_name:"Release "+suffix,tenant_code:"R"+stamp+suffix,tenant_sync_status:"TEST"}});
      tenants.push(result.tenant_id);
      await prisma.organization_app_entitlement.create({data:{tenant_fk:result.tenant_id,app_code:"CRM",entitlement_status:"ACTIVE",last_synced_at:new Date()}});
      return result;
    };
    const a=await tenant("A"), b=await tenant("B");
    const user=async (org,suffix,role,grants,owner=false)=>prisma.user.create({data:{tenant_fk:org.tenant_id,user_name:suffix,user_email:stamp+"."+suffix+"@example.test",user_password:await hashPassword("TestPassword123!"),user_role:role,user_is_tenant_owner:owner,user_module_access:grants}});
    const admin=await user(a,"owner","ADMIN",null,true);
    const employee=await user(a,"sales","SALES","CONTACTS:VIEW,CREATE,EDIT,DELETE|TASKS:VIEW,CREATE,EDIT|OPPORTUNITIES:VIEW,CREATE,EDIT");
    const restricted=await user(a,"reader","SALES","CONTACTS:VIEW");
    const other=await user(b,"foreign","SALES",null);
    const contact=async(org,suffix)=>prisma.contact.create({data:{tenant_fk:org.tenant_id,contact_code:"R"+stamp+suffix,contact_firstname:"Test",contact_lastname:suffix}});
    const ca=await contact(a,"A"),cb=await contact(b,"B");
    server=app.listen(0,"127.0.0.1");
    await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject);});
    const base="http://127.0.0.1:"+server.address().port;
    const request=async(actor,method,path,data)=>{
      const response=await fetch(base+path,{method,headers:{Authorization:"Bearer "+signSessionToken(actor),"Content-Type":"application/json"},...(data===undefined?{}:{body:JSON.stringify(data)})});
      return {status:response.status,body:await response.json()};
    };
    const endpoint="/api/contacts/"+ca.contact_id;
    const call={call_contact_fk:ca.contact_id,call_subject:"Preference",call_description:"Do not call",call_outcome:"DNC"};
    const due=new Date(Date.now()+86400000).toISOString();
    const count=()=>prisma.call.count({where:{tenant_fk:a.tenant_id}});
    const initial=await count();
    assert.equal((await request(employee,"POST","/api/calls",{...call,followup:{subject:"Invalid assignee",due,assignee:other.user_id}})).status,403);
    assert.equal(await count(),initial);
    assert.equal((await request(employee,"POST","/api/calls",{...call,call_contact_fk:cb.contact_id})).status,400);
    assert.equal(await count(),initial);
    const saved=await request(employee,"POST","/api/calls",{...call,mark_do_not_call:true,followup:{subject:"Send email",due,assignee:employee.user_id}});
    assert.equal(saved.status,201,JSON.stringify(saved.body));
    assert.equal(saved.body.followup_task.task_call_fk,saved.body.call_id);
    assert.equal((await prisma.contact.findUnique({where:{contact_id:ca.contact_id}})).contact_call_status,"DNC");
    const selfTask=saved.body.followup_task.task_id;
    assert.equal((await request(employee,"PATCH","/api/tasks/"+selfTask,{task_due_date:new Date(Date.now()+172800000).toISOString()})).status,200);
    const assigned=await prisma.task.create({data:{tenant_fk:a.tenant_id,task_contact_fk:ca.contact_id,task_user_fk:employee.user_id,task_assigned_by_fk:admin.user_id,task_subject:"Manager task"}});
    assert.equal((await request(employee,"PATCH","/api/tasks/"+assigned.task_id,{task_due_date:due})).status,403);
    const note={entry_kind:"NOTE",entry_subject:"Original",entry_description:"Internal note"};
    assert.equal((await request(restricted,"POST",endpoint+"/activities",note)).status,403);
    const created=await request(employee,"POST",endpoint+"/activities",note);
    assert.equal(created.status,201,JSON.stringify(created.body));
    const entry=created.body.data, path=endpoint+"/activities/"+entry.entry_id;
    const patch={entry_revision:entry.entry_revision,entry_subject:"Corrected",entry_description:"Updated note",entry_occurred_at:entry.entry_occurred_at};
    assert.equal((await request(other,"GET",endpoint+"/activities")).status,404);
    assert.equal((await request(employee,"PATCH",path,patch)).status,200);
    assert.equal((await request(employee,"PATCH",path,patch)).status,409);
    assert.equal((await request(employee,"DELETE",path)).status,200);
    const audit=await prisma.contact_activity_entry.findUnique({where:{entry_id:entry.entry_id}});
    assert.ok(audit.entry_deleted_at);
    assert.equal(audit.entry_audit[0].previous.subject,"Original");
    assert.equal(audit.entry_audit[1].action,"DELETE");
    assert.equal((await request(employee,"GET",endpoint+"/activities")).body.data.length,0);
    assert.equal((await request(employee,"PATCH",endpoint+"/relationship",{contact_relationship_stage:"QUALIFIED"})).status,200);
    const commercial={opportunity_name:"Test deal",opportunity_close_date:"2027-01-31",opportunity_stage:"FOLLOW_UP",opportunity_value:"1250.50",opportunity_currency:"INR",opportunity_next_step:"Send quote"};
    const deal=await request(employee,"POST",endpoint+"/opportunities",commercial);
    assert.equal(deal.status,201,JSON.stringify(deal.body));
    const id=deal.body.data.opportunity_id;
    assert.equal((await request(employee,"PUT","/api/opportunities/"+id,{opportunity_contact_fk:cb.contact_id})).status,400);
    assert.equal((await request(employee,"PUT","/api/opportunities/"+id,{tenant_fk:b.tenant_id,opportunity_next_step:"Review quote"})).status,200);
    const stored=await prisma.opportunity.findUnique({where:{opportunity_id:id}});
    assert.equal(stored.tenant_fk,a.tenant_id);
    assert.equal(stored.opportunity_next_step,"Review quote");
    assert.equal((await request(restricted,"GET",endpoint)).body.data.opportunities,undefined);
    const template=await request(admin,"POST","/api/email-templates",{name:"Release template",subject:"Hello {{contact_firstname}}",body_html:"<p>Test</p>"});
    assert.equal(template.status,201,JSON.stringify(template.body));
    assert.equal((await request(employee,"GET","/api/email-templates")).body.data.some(x=>x.email_template_id===template.body.data.email_template_id),true);
    assert.equal((await request(restricted,"POST","/api/emails/send",{to:"invalid"})).status,403);
    assert.equal((await request(other,"GET","/api/email-templates/"+template.body.data.email_template_id)).status!==200,true);
  }finally{
    if(server)await new Promise(resolve=>server.close(resolve));
    // The database is disposable; explicitly remove just our own fixtures.
    const where={tenant_fk:{in:tenants}};
    for(const model of ["task_update","task","contact_activity_entry","call","opportunity","contact","email_template","organization_app_entitlement","user"])await prisma[model].deleteMany({where});
    await prisma.tenant.deleteMany({where:{tenant_id:{in:tenants}}});
    await prisma.$disconnect();
  }
});
