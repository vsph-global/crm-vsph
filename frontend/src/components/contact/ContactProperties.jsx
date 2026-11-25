import { memo, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { CopyGlyph, Tooltip } from "./ContactMotion";
import { useCopyFeedback } from "./useCopyFeedback.js";
import { Link } from "react-router-dom";
import { emailLink, phoneLink, safeWebLink, humanize, present, formatDate } from "./contactWorkspaceUtils.js";

export function Expandable({ open, id, children, className = "" }) {
  const inner = useRef(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    const measure = () => setHeight(node.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div id={id} className={`cw-expand ${className}`} inert={!open} aria-hidden={!open} style={{height: open ? height : 0, opacity: open ? 1 : 0}}>
    <div ref={inner}>{children}</div>
  </div>;
}

function Property({ label, value, href, to, copy = false, fallback = "Not provided", external = false, singleLine = false }) {
  const {copied,error:copyError,copy:copyValue} = useCopyFeedback(value);
  const hasValue = present(value);
  const fullText = hasValue ? String(value) : fallback;
  const valueNode = hasValue && to ? <Link className="cw-property-text" to={to}>{value}</Link> : hasValue && href ?
    <a className={`cw-property-text${singleLine ? " cw-property-single-line" : ""}${external ? " cw-property-external" : ""}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{external ? <><span className="cw-external-label">{value}</span><ExternalLink size={14} aria-hidden="true" /></> : value}</a> :
    <span className={`cw-property-text${singleLine && hasValue ? " cw-property-single-line" : ""}`} tabIndex={singleLine && hasValue ? 0 : undefined}>{fullText}</span>;
  return <div className="cw-property">
    <dt>{label}</dt>
    <dd className={!hasValue ? "cw-muted" : ""}>
      <div className="cw-property-value">
        {hasValue && (singleLine || external) ? <Tooltip text={fullText}>{valueNode}</Tooltip> : valueNode}
        {copy && hasValue && <Tooltip text={copied ? "Copied" : `Copy ${label}`}><button type="button" className="cw-icon" aria-label={copied ? `${label} copied` : `Copy ${label}`} onClick={copyValue}><CopyGlyph copied={copied}/></button></Tooltip>}
      </div>
      {copy && <span className="cw-sr" role="status">{copied ? `${label} copied` : ""}</span>}
      {copyError && <span role="alert" className="cw-error-text">{singleLine ? "Could not copy. Open all contact details to select the full value." : "Could not copy. Select the value to copy it manually."}</span>}
    </dd>
  </div>;
}

function PropertyGroup({ title, children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <section className="cw-property-group">
    <h3><button type="button" className="cw-disclosure" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      {title}<ChevronDown size={18} className="cw-chevron" aria-hidden="true" />
    </button></h3>
    <Expandable id={id} open={open}><dl className="cw-property-list cw-secondary-properties">{children}</dl></Expandable>
  </section>;
}

function ContactProperties({ contact: c, summary, historyLoading, historyError, canViewTasks, onEditRelationship }) {
  const [allOpen,setAllOpen] = useState(false);
  const allId = useId();
  const phone = c.contact_mobile || c.contact_phone;
  const email = c.contact_professional_email || c.contact_personal_email;
  const billing = c.contact_account_billing_address?.[0] || {};
  const shipping = c.contact_account_shipping_address?.[0] || {};
  const fields = (entries) => entries.map(([label, value, options]) => <Property key={label} label={label} value={value} {...options}/>);
  const address = (data, prefix) => fields([["Street", data[prefix+"_street"]], ["City", data[prefix+"_city"]], ["State / province", data[prefix+"_state"]], ["Postal code", data[prefix+"_zip"]], ["Country", data[prefix+"_country"]], ["Phone", data[prefix+"_phone"], {href:phoneLink(data[prefix+"_phone"])}]]);
  return <aside className="cw-panel cw-properties" aria-labelledby="contact-properties-title">
    <h2 id="contact-properties-title" className="cw-panel-heading">Contact details</h2>
    {c.contact_call_status==="DNC"&&<p className="cw-contact-caution" role="status">Do not call — check the contact’s communication preferences before outreach.</p>}
    <dl className="cw-property-list cw-summary-properties">
      {fields([
        ["Email", email, {href: emailLink(email), copy: true, singleLine: true}],
        ["Phone", phone, {href: phoneLink(phone), copy: true, singleLine: true}],
        ["Account", c.account?.account_name, {to: c.contact_account_fk ? `/v2/accounts?account_id=${encodeURIComponent(c.contact_account_fk)}` : null, fallback:"Not assigned"}],
        ["Designation", c.contact_designation],
        ["Role",c.contact_role],
        ["Record status",humanize(c.contact_status)],
        ["Relationship",humanize(c.contact_relationship_stage,"Not set")],
        ["Call status",humanize(c.contact_call_status)],
        ["Last logged interaction",summary?.lastInteraction?`${summary.lastInteraction.kind==="linkedin"?"LinkedIn":humanize(summary.lastInteraction.kind)} · ${formatDate(summary.lastInteraction.date)}`:null,{fallback:historyLoading?"Loading…":historyError?"Unavailable":"No interactions logged"}],
        ...(canViewTasks?[["Next scheduled task",summary?.nextTask?`${summary.nextTask.task_subject || "Untitled task"} · ${formatDate(summary.nextTask.task_due_date)}`:null,{fallback:historyLoading?"Loading…":historyError?"Unavailable":"No scheduled task"}]]:[]),
        ["Contact owner", c.contact_owner?.user_name, {fallback:"Not assigned"}],
        ["Campaign", c.contact_campaign?.campaign_name, {fallback:"Not assigned"}],
      ])}
    </dl>
    {onEditRelationship&&<div className="cw-relationship-action"><button type="button" className="cw-link" onClick={onEditRelationship}>Edit relationship</button></div>}
    <div className="cw-details-footer"><button type="button" className="cw-details-toggle" aria-expanded={allOpen} aria-controls={allId} onClick={()=>setAllOpen(v=>!v)}>{allOpen ? "Hide additional contact details" : "View all contact details"}<ChevronRight size={18} className="cw-details-chevron" aria-hidden="true"/></button></div>
    <div id={allId} className="cw-all-details" data-open={allOpen} inert={!allOpen} aria-hidden={!allOpen}><div className="cw-all-details-inner">
    <PropertyGroup title="Professional information">
      {fields([["Title",c.contact_title],["Department",c.contact_department],["Role",c.contact_role],["Reports to",c.contact_reportsto],["Industry",c.contact_industry?.industry_name],["Employee size",c.contact_employee_size],["Level",c.contact_level_field],["Segment",c.contact_segment],["Partner name",c.contact_partner_name],["Profile link",c.contact_profile_link,{href:safeWebLink(c.contact_profile_link),external:true}],["Navigator link",c.contact_navigator_link,{href:safeWebLink(c.contact_navigator_link),external:true}]])}
    </PropertyGroup>
    <PropertyGroup title="Additional information">
      {fields([["Salutation",c.contact_salutation],["First name",c.contact_firstname],["Middle name",c.contact_middlename],["Last name",c.contact_lastname],["Suffix",c.contact_suffix],["TPID",c.contact_tpid],["Professional email",c.contact_professional_email,{href:emailLink(c.contact_professional_email),copy:true}],["Mobile number",c.contact_mobile,{href:phoneLink(c.contact_mobile),copy:true}],["Personal email",c.contact_personal_email,{href:emailLink(c.contact_personal_email),copy:true}],["Phone",c.contact_phone,{href:phoneLink(c.contact_phone)}],["Alternate number",c.contact_alternate_number,{href:phoneLink(c.contact_alternate_number)}],["Landline",c.contact_landline_number,{href:phoneLink(c.contact_landline_number)}],["Fax number",c.contact_fax_number],["Contact status",humanize(c.contact_status)],["Call status",humanize(c.contact_call_status)],["Email status",humanize(c.contact_email_status)],["Number status",humanize(c.contact_phone_status)]])}
    </PropertyGroup>
    <PropertyGroup title="Billing address">{address(billing,"billing")}</PropertyGroup>
    <PropertyGroup title="Shipping address">{address(shipping,"shipping")}</PropertyGroup>
    <PropertyGroup title="Mailing address">
      {fields([["City",c.contact_city],["State",c.contact_state],["Country",c.contact_country],["Location",c.contact_location]])}
    </PropertyGroup>
    <PropertyGroup title="Campaign and project">
      {fields([["Campaign",c.contact_campaign?.campaign_name,{fallback:"Not assigned"}],["Project",c.contact_project?.project_name,{fallback:"Not assigned"}]])}
    </PropertyGroup>
    <PropertyGroup title="Pickup and drop">
      {fields([["Pickup date",formatDate(c.contact_pickup_date,true)],["Drop date",formatDate(c.contact_drop_date,true)],["Pickup time",c.contact_pickup_time],["Drop time",c.contact_drop_time],["Pickup location",c.contact_pickup_location],["Drop location",c.contact_drop_location]])}
    </PropertyGroup>
    </div></div>
  </aside>;
}

export default memo(ContactProperties);
