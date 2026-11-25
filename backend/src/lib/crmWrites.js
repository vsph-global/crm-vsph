import { CALL_OUTCOMES, OPPORTUNITY_STAGES } from "./contactActivities.js";
const enums={opportunity_stage:OPPORTUNITY_STAGES,opportunity_call_status:CALL_OUTCOMES,opportunity_type:["INBOUND","OUTBOUND"],opportunity_engagement_form:["DELEGATE","SPEAKER","SPONSOR","MEETING","RESEARCH_CALL","OPERATION"],opportunity_payment_status:["PENDING","PARTIAL","PAID","REFUNDED"],opportunity_loss_reason:["BUDGET_CONSTRAINTS","TIMELINE_MISMATCH","COMPETITOR_SELECTED","NO_DECISION","NOT_INTERESTED","PRODUCT_FIT","INTERNAL_PRIORITIES_CHANGED","PRICING"]};
export const opportunityRelations={opportunity_owner_fk:["user","user_id","user_deleted_at"],opportunity_account_fk:["account","account_id"],opportunity_contact_fk:["contact","contact_id","contact_deleted_at"],opportunity_project_id:["project","project_id"],opportunity_campaign_id:["campaign","campaign_id"]};
const dates=["opportunity_close_date","opportunity_pitched_at","opportunity_pickup_date","opportunity_drop_date"];
const texts=["opportunity_name","opportunity_pickup_time","opportunity_pickup_location","opportunity_drop_time","opportunity_drop_location","opportunity_next_step"];
export function opportunityWrite(body,existing=null){
  const data={};
  for(const field of [...Object.keys(enums),...Object.keys(opportunityRelations),...dates,...texts]){
    if(!Object.hasOwn(body,field))continue;
    const value=body[field];
    if(value===null||value===""){data[field]=null;continue;}
    if(typeof value!=="string")return {error:"Invalid "+field};
    if(dates.includes(field)){
      const date=new Date(value);
      if(!Number.isFinite(date.getTime()))return {error:"Invalid "+field};
      data[field]=date;
    }else{
      if(enums[field]&&!enums[field].includes(value))return {error:"Invalid "+field};
      if(value.length>191)return {error:"Value too long: "+field};
      data[field]=value.trim();
    }
  }
  for(const field of ["opportunity_name","opportunity_owner_fk","opportunity_close_date"]){
    if(!(Object.hasOwn(data,field)?data[field]:existing?.[field]))return {error:"Name, owner and close date are required."};
  }
  if(Object.hasOwn(body,"opportunity_value")||Object.hasOwn(body,"opportunity_currency")){
    const amount=Object.hasOwn(body,"opportunity_value")?body.opportunity_value:existing?.opportunity_value;
    const currency=Object.hasOwn(body,"opportunity_currency")?body.opportunity_currency:existing?.opportunity_currency;
    if(amount==null||amount===""){data.opportunity_value=null;data.opportunity_currency=null;}
    else{
      const value=String(amount),code=String(currency||"").toUpperCase();
      if(!/^\d{1,16}(\.\d{1,2})?$/.test(value)||!/^[A-Z]{3}$/.test(code))return {error:"Enter a nonnegative amount and a three-letter currency code."};
      data.opportunity_value=value;data.opportunity_currency=code;
    }
  }
  return {data};
}
export function callWrite(body){
  const data={};
  for(const field of ["call_subject","call_description"]){
    if(!Object.hasOwn(body,field))continue;
    if(typeof body[field]!=="string"||!body[field].trim()||body[field].length>191)return {error:"Enter valid call subject and notes (up to 191 characters each)."};
    data[field]=body[field].trim();
  }
  if(Object.hasOwn(body,"call_outcome")){
    if(body.call_outcome!=null&&!CALL_OUTCOMES.includes(body.call_outcome))return {error:"Invalid call outcome."};
    data.call_outcome=body.call_outcome;
  }
  return {data};
}
