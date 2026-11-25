import { useState, useEffect, useRef } from "react";
import { Loader2, User } from "lucide-react";
import Button from "../ui/Button";
import Modal from "../ui/Modal";
import { useDialogExit } from "../contact/useDialogExit";
import SearchableSelect from "../ui/SearchableSelect";
import { api } from "../../utils/api";
import { readSessionValue } from "../../utils/session.js";
import { INDUSTRIES } from "../../data/industries";
import toast from "react-hot-toast";

const ContactForm = ({
  isOpen,
  onClose,
  onSuccess,
  contactToEdit,
  defaultAccountId,
  workspaceMotion = false,
  focusCampaign = false,
  canAssignCampaign = false,
}) => {
  const [loading, setLoading] = useState(false);
  const {closing,close}=useDialogExit(onClose,workspaceMotion);
  const submitLock=useRef(false);
  const [error, setError] = useState("");
  const ownerId=contactToEdit?contactToEdit.contact_owner_fk:readSessionValue("vsph_user_id");
  const ownerName=contactToEdit?contactToEdit.contact_owner?.user_name||"Unknown User":readSessionValue("vsph_user_name")||"Unknown User";
  const [accounts, setAccounts] = useState([]);
  const [projects] = useState([]);
  const [campaigns] = useState([]);
  const [workspaceCampaigns,setWorkspaceCampaigns] = useState([]);
  const [campaignError,setCampaignError] = useState("");
  const [campaignLoading,setCampaignLoading] = useState(false);
  const campaignRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const getInputClass = (fieldName) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
      fieldErrors[fieldName]
        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
        : "border-slate-200 focus:ring-vsph-core-blue/20 focus:border-vsph-core-blue"
    }`;

  const defaultFormData = {
    contact_salutation: "MR",
    contact_firstname: "",
    contact_middlename: "",
    contact_lastname: "",
    contact_suffix: "",
    contact_title: "",
    contact_designation: "",
    contact_role: "",
    contact_department: "",
    contact_partner_name: "",
    contact_reportsto: "",

    contact_professional_email: "",
    contact_personal_email: "",
    contact_phone: "",
    contact_mobile: "",
    contact_alternate_number: "",
    contact_landline_number: "",
    contact_fax_number: "",
    contact_profile_link: "",
    contact_navigator_link: "",

    contact_account_fk: "",
    contact_industry_fk: "",
    contact_project_fk: "",
    contact_campaign_fk: "",

    contact_call_status: "CONNECTED",
    contact_email_status: "VALID",
    contact_phone_status: "VALID",
    contact_status: "ACTIVE",
    contact_segment: "",
    contact_level_field: "",
    contact_tpid: "",
    contact_employee_size: "",

    contact_city: "",
    contact_state: "",
    contact_country: "",
    contact_pickup_date: "",
    contact_pickup_time: "",
    contact_pickup_location: "",
    contact_drop_date: "",
    contact_drop_time: "",
    contact_drop_location: "",

    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
    billing_country: "",

    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_country: "",
  };

  const [formData, setFormData] = useState(() => {
    if (contactToEdit) {
      const billing = contactToEdit.contact_account_billing_address?.[0] || {};
      const shipping =
        contactToEdit.contact_account_shipping_address?.[0] || {};

      const formattedDate = (isoString) =>
        isoString ? new Date(isoString).toISOString().split("T")[0] : "";

      return {
        ...defaultFormData,
        ...contactToEdit,
        contact_pickup_date: formattedDate(contactToEdit.contact_pickup_date),
        contact_drop_date: formattedDate(contactToEdit.contact_drop_date),
        billing_street: billing.billing_street || "",
        billing_city: billing.billing_city || "",
        billing_state: billing.billing_state || "",
        billing_zip: billing.billing_zip || "",
        billing_country: billing.billing_country || "",
        shipping_street: shipping.shipping_street || "",
        shipping_city: shipping.shipping_city || "",
        shipping_state: shipping.shipping_state || "",
        shipping_zip: shipping.shipping_zip || "",
        shipping_country: shipping.shipping_country || "",
      };
    } else {
      return {
        ...defaultFormData,
        contact_account_fk: defaultAccountId || "",
      };
    }
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await api.get("/api/accounts?limit=100");
        if (response.success) {
          setAccounts(
            response.data.map((acc) => ({
              id: acc.account_id,
              name: acc.account_name,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
    };

    if (isOpen) fetchAccounts();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !workspaceMotion || !canAssignCampaign) return;
    let cancelled = false;
    const load = async () => {
      setCampaignLoading(true);
      try {
        const records = []; let page = 1, pages;
        do {
          const response = await api.get(`/api/campaigns?limit=100&page=${page}`);
          if (!response.success || !Array.isArray(response.data)) throw new Error(response.message || "Could not load campaigns.");
          records.push(...response.data);
          pages = response.pagination?.totalPages || 1;
          page++;
        } while (!cancelled && page <= pages);
        if (!cancelled) { setWorkspaceCampaigns(records); setCampaignError(""); }
      } catch (err) { if (!cancelled) setCampaignError(err.message || "Could not load campaigns."); }
      finally { if (!cancelled) setCampaignLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen,workspaceMotion,canAssignCampaign]);

  useEffect(() => {
    if (!isOpen || !workspaceMotion || !focusCampaign || campaignLoading) return;
    const frame = requestAnimationFrame(() => {
      campaignRef.current?.scrollIntoView({block:"center"});
      campaignRef.current?.focus({preventScroll:true});
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen,workspaceMotion,focusCampaign,campaignLoading]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitLock.current || loading || closing || (workspaceMotion && focusCampaign && (campaignLoading || campaignError))) return;
    submitLock.current=true;
    setLoading(true);
    setError("");

    try {
      if (!ownerId) {
        toast.error("User is not logged in.");
        setLoading(false);
        return;
      }

      setFieldErrors({});
      const newErrors = {};

      if (!formData.contact_firstname.trim()) newErrors.contact_firstname = true;
      if (!formData.contact_lastname.trim()) newErrors.contact_lastname = true;

      if (
        formData.contact_professional_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_professional_email)
      ) {
        newErrors.contact_professional_email = true;
      }

      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        if(workspaceMotion)requestAnimationFrame(()=>document.getElementById("cw-edit-"+Object.keys(newErrors)[0])?.focus());
        else if (newErrors.contact_firstname || newErrors.contact_lastname) toast.error("First and Last name are required.");
        else if (newErrors.contact_professional_email) toast.error("Please enter a valid email address.");
        setLoading(false);
        return;
      }

      let account_fk = formData.contact_account_fk;
      if (account_fk && !account_fk.includes("-")) {
        const found = accounts.find((a) => a.name === account_fk);
        if (found) account_fk = found.id;
      }

      const payload = {
        ...formData,
        contact_account_fk: account_fk,
        contact_owner_fk: ownerId,
        contact_pickup_date: formData.contact_pickup_date
          ? new Date(formData.contact_pickup_date).toISOString()
          : null,
        contact_drop_date: formData.contact_drop_date
          ? new Date(formData.contact_drop_date).toISOString()
          : null,
      };

      let response;
      if (contactToEdit) {
        response = await api.put(
          `/api/contacts/${contactToEdit.contact_id}`,
          payload,
        );
      } else {
        response = await api.post("/api/contacts", payload);
      }

      if (response.success) {
        toast.success(
          contactToEdit
            ? "Contact updated successfully!"
            : "Contact created successfully!",
          workspaceMotion ? {id:"cw-contact-edit",duration:2500} : undefined,
        );
        setFieldErrors({});
        onSuccess();
        close();
      } else {
        if (!workspaceMotion) toast.error(
          response.message ||
            (contactToEdit
              ? "Failed to update contact"
              : "Failed to create contact"),
        );
        setError(response.message || "Failed to create contact");
      }
    } catch (err) {
      if (!workspaceMotion) toast.error(err.message || "An error occurred.");
      setError(err.message || "An error occurred.");
    } finally {
      submitLock.current=false;
      setLoading(false);
    }
  };

  const headerActions = workspaceMotion ? <div className="cw-contact-owner"><span>Owner:</span><strong>{ownerName}</strong></div> : (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
      <div className="bg-blue-100 p-1 rounded-full text-blue-600">
        <User size={14} />
      </div>
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        Owner:
      </span>
      <span className="text-sm font-bold text-slate-800">{ownerName}</span>
    </div>
  );

  const footerActions = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={close}
        disabled={workspaceMotion && (loading||closing)}
        className="text-vsph-navy hover:bg-vsph-grey"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="add-contact-form"
        variant="primary"
        disabled={loading || closing || (workspaceMotion && focusCampaign && (campaignLoading || !!campaignError))}
        className="min-w-[120px]"
      >
        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
        {loading ? "Saving..." : "Save Contact"}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      closing={closing}
      title={focusCampaign ? "Assign campaign" : contactToEdit ? (workspaceMotion?"Edit contact":"Edit Contact") : "Add New Contact"}
      workspaceMotion={workspaceMotion}
      busy={loading}
      widthClass="w-[75vw] max-w-5xl"
      headerActions={headerActions}
      footer={footerActions}
    >
      <form id="add-contact-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div role="alert" className={workspaceMotion?"cw-error m-6 mb-0":"m-6 mb-0 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100"}>
            {error}
          </div>
        )}

        <div className={workspaceMotion?"space-y-6 cw-contact-edit-fields":"space-y-6 p-6"}>
          {/* Section 1: Basic Info */}
          <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-core-blue rounded-full"></span>}
              Basic Information
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_salutation" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Salutation
                </label>
                <select
                  name="contact_salutation" id="cw-edit-contact_salutation"
                  value={formData.contact_salutation}
                  onChange={handleChange}
                  className={getInputClass("contact_salutation") + " bg-white"}
                >
                  <option value="MR">Mr.</option>
                  <option value="MRS">Mrs.</option>
                  <option value="MS">Ms.</option>
                  <option value="DR">Dr.</option>
                  <option value="PROF">Prof.</option>
                </select>
              </div>
              <div>
                <label htmlFor="cw-edit-contact_firstname" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  First name *
                </label>
                <input
                  type="text"
                  name="contact_firstname" id="cw-edit-contact_firstname" aria-invalid={!!fieldErrors.contact_firstname} aria-describedby={workspaceMotion&&fieldErrors.contact_firstname?"cw-error-contact_firstname":undefined}
                  value={formData.contact_firstname}
                  onChange={handleChange}
                  className={getInputClass("contact_firstname")}
                  placeholder="First Name"
                />
                {workspaceMotion&&fieldErrors.contact_firstname&&<p id="cw-error-contact_firstname" role="alert" className="cw-contact-field-error">Enter a first name.</p>}
              </div>
              <div>
                <label htmlFor="cw-edit-contact_middlename" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Middle name
                </label>
                <input
                  type="text"
                  name="contact_middlename" id="cw-edit-contact_middlename"
                  value={formData.contact_middlename}
                  onChange={handleChange}
                  className={getInputClass("contact_middlename")}
                  placeholder="Middle Name"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_lastname" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Last name *
                </label>
                <input
                  type="text"
                  name="contact_lastname" id="cw-edit-contact_lastname" aria-invalid={!!fieldErrors.contact_lastname} aria-describedby={workspaceMotion&&fieldErrors.contact_lastname?"cw-error-contact_lastname":undefined}
                  value={formData.contact_lastname}
                  onChange={handleChange}
                  className={getInputClass("contact_lastname")}
                  placeholder="Last Name"
                />
                {workspaceMotion&&fieldErrors.contact_lastname&&<p id="cw-error-contact_lastname" role="alert" className="cw-contact-field-error">Enter a last name.</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_suffix" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Suffix
                </label>
                <input
                  type="text"
                  name="contact_suffix" id="cw-edit-contact_suffix"
                  value={formData.contact_suffix}
                  onChange={handleChange}
                  className={getInputClass("contact_suffix")}
                  placeholder="Suffix"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_title" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  name="contact_title" id="cw-edit-contact_title"
                  value={formData.contact_title}
                  onChange={handleChange}
                  className={getInputClass("contact_title")}
                  placeholder="Title"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_designation" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  name="contact_designation" id="cw-edit-contact_designation"
                  value={formData.contact_designation}
                  onChange={handleChange}
                  className={getInputClass("contact_designation")}
                  placeholder="Designation"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_role" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Role
                </label>
                <input
                  type="text"
                  name="contact_role" id="cw-edit-contact_role"
                  value={formData.contact_role}
                  onChange={handleChange}
                  className={getInputClass("contact_role")}
                  placeholder="Role"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="cw-edit-contact_department" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  name="contact_department" id="cw-edit-contact_department"
                  value={formData.contact_department}
                  onChange={handleChange}
                  className={getInputClass("contact_department")}
                  placeholder="Department"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_partner_name" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Partner Name
                </label>
                <input
                  type="text"
                  name="contact_partner_name" id="cw-edit-contact_partner_name"
                  value={formData.contact_partner_name}
                  onChange={handleChange}
                  className={getInputClass("contact_partner_name")}
                  placeholder="Partner Name"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_reportsto" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Reports To
                </label>
                <input
                  type="text"
                  name="contact_reportsto" id="cw-edit-contact_reportsto"
                  value={formData.contact_reportsto}
                  onChange={handleChange}
                  className={getInputClass("contact_reportsto")}
                  placeholder="Reports To"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Details */}
          <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-navy rounded-full"></span>}
              Contact Details
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_professional_email" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Professional email
                </label>
                <input
                  type="email"
                  name="contact_professional_email" id="cw-edit-contact_professional_email" aria-invalid={!!fieldErrors.contact_professional_email} aria-describedby={workspaceMotion&&fieldErrors.contact_professional_email?"cw-error-contact_professional_email":undefined}
                  value={formData.contact_professional_email}
                  onChange={handleChange}
                  className={getInputClass("contact_professional_email")}
                  placeholder="Work Email"
                />
                {workspaceMotion&&fieldErrors.contact_professional_email&&<p id="cw-error-contact_professional_email" role="alert" className="cw-contact-field-error">Enter a valid email address.</p>}
              </div>
              <div>
                <label htmlFor="cw-edit-contact_personal_email" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Personal email
                </label>
                <input
                  type="email"
                  name="contact_personal_email" id="cw-edit-contact_personal_email"
                  value={formData.contact_personal_email}
                  onChange={handleChange}
                  className={getInputClass("contact_personal_email")}
                  placeholder="Personal Email"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_phone" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="contact_phone" id="cw-edit-contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className={getInputClass("contact_phone")}
                  placeholder="Phone"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_mobile" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Mobile
                </label>
                <input
                  type="tel"
                  name="contact_mobile" id="cw-edit-contact_mobile"
                  value={formData.contact_mobile}
                  onChange={handleChange}
                  className={getInputClass("contact_mobile")}
                  placeholder="Mobile"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_alternate_number" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Alternate Number
                </label>
                <input
                  type="tel"
                  name="contact_alternate_number" id="cw-edit-contact_alternate_number"
                  value={formData.contact_alternate_number}
                  onChange={handleChange}
                  className={getInputClass("contact_alternate_number")}
                  placeholder="Alt Number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_landline_number" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Landline
                </label>
                <input
                  type="tel"
                  name="contact_landline_number" id="cw-edit-contact_landline_number"
                  value={formData.contact_landline_number}
                  onChange={handleChange}
                  className={getInputClass("contact_landline_number")}
                  placeholder="Landline"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_fax_number" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Fax
                </label>
                <input
                  type="tel"
                  name="contact_fax_number" id="cw-edit-contact_fax_number"
                  value={formData.contact_fax_number}
                  onChange={handleChange}
                  className={getInputClass("contact_fax_number")}
                  placeholder="Fax"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cw-edit-contact_profile_link" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  name="contact_profile_link" id="cw-edit-contact_profile_link"
                  value={formData.contact_profile_link}
                  onChange={handleChange}
                  className={getInputClass("contact_profile_link")}
                  placeholder="LinkedIn URL"
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_navigator_link" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Navigator Link
                </label>
                <input
                  type="url"
                  name="contact_navigator_link" id="cw-edit-contact_navigator_link"
                  value={formData.contact_navigator_link}
                  onChange={handleChange}
                  className={getInputClass("contact_navigator_link")}
                  placeholder="Sales Navigator URL"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Relations */}
          <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-core-blue rounded-full"></span>}
              Relations
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Linked account
                </label>
                <SearchableSelect
                  options={accounts.map((a) => a.name)}
                  value={
                    accounts.find((a) => a.id === formData.contact_account_fk)
                      ?.name || formData.contact_account_fk
                  }
                  onChange={(val) => {
                    const acc = accounts.find((a) => a.name === val);
                    setFormData({
                      ...formData,
                      contact_account_fk: acc ? acc.id : val,
                    });
                  }}
                  workspaceMotion={workspaceMotion} controlId="cw-edit-select-account" label="Linked Account"
                  placeholder="Select Account"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Industry
                </label>
                <SearchableSelect
                  options={INDUSTRIES}
                  value={formData.contact_industry_fk}
                  onChange={(val) =>
                    setFormData({ ...formData, contact_industry_fk: val })
                  }
                  workspaceMotion={workspaceMotion} controlId="cw-edit-select-industry" label="Industry"
                  placeholder="Select Industry"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Project
                </label>
                <SearchableSelect
                  options={projects}
                  value={formData.contact_project_fk}
                  onChange={(val) =>
                    setFormData({ ...formData, contact_project_fk: val })
                  }
                  workspaceMotion={workspaceMotion} controlId="cw-edit-select-project" label="Project"
                  placeholder="Select Project"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Campaign
                </label>
                {workspaceMotion && canAssignCampaign ? <>
                  <select ref={campaignRef} aria-label="Campaign" value={formData.contact_campaign_fk || ""} disabled={campaignLoading || !!campaignError} onChange={e => setFormData({...formData,contact_campaign_fk:e.target.value})}>
                    <option value="">Not assigned</option>
                    {contactToEdit?.contact_campaign_fk && !workspaceCampaigns.some(c => c.campaign_id === contactToEdit.contact_campaign_fk) && <option value={contactToEdit.contact_campaign_fk}>{contactToEdit.contact_campaign?.campaign_name || "Current campaign"}</option>}
                    {workspaceCampaigns.map(c => <option key={c.campaign_id} value={c.campaign_id}>{c.campaign_name}</option>)}
                  </select>
                  {campaignLoading && <p role="status" className="text-sm text-slate-600">Loading campaigns…</p>}
                  {campaignError && <p role="alert" className="text-sm text-rose-700">{campaignError} Close and reopen to retry.</p>}
                </> : workspaceMotion ? <p className="text-sm text-slate-600">{contactToEdit?.contact_campaign?.campaign_name || "Not assigned"}</p> : <SearchableSelect
                  options={campaigns}
                  value={formData.contact_campaign_fk}
                  onChange={(val) =>
                    setFormData({ ...formData, contact_campaign_fk: val })
                  }
                  workspaceMotion={workspaceMotion} controlId="cw-edit-select-campaign" label="Campaign"
                  placeholder="Select Campaign"
                />}
              </div>
            </div>
          </div>

          {/* Section 4: Status & Segmentation */}
          <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-navy rounded-full"></span>}
              Status & Segmentation
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Call status
                </label>
                <select
                  name="contact_call_status"
                  value={formData.contact_call_status}
                  onChange={handleChange}
                  className={getInputClass("contact_call_status") + " bg-white"}
                >
                  <option value="RINGING">Ringing</option>
                  <option value="PITCH_DONE">Pitch Done</option>
                  <option value="NOT_INTERESTED">Not Interested</option>
                  <option value="NOT_RELEVANT">Not Relevant</option>
                  <option value="LEFT_ORGANIZATION">Left Organization</option>
                  <option value="NOT_AVAILABLE">Not Available</option>
                  <option value="CONNECTED">Connected</option>
                  <option value="NOT_CONNECTED">Not Connected</option>
                  <option value="WRONG_NUMBER">Wrong Number</option>
                  <option value="DNC">DNC</option>
                </select>
              </div>
              <div>
                <label htmlFor="cw-edit-contact_email_status" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Email status
                </label>
                <select
                  name="contact_email_status" id="cw-edit-contact_email_status"
                  value={formData.contact_email_status}
                  onChange={handleChange}
                  className={
                    getInputClass("contact_email_status") + " bg-white"
                  }
                >
                  <option value="GENERATED">Generated</option>
                  <option value="NOT_FOUND">Not Found</option>
                  <option value="PENDING">Pending</option>
                  <option value="RECHECKED">Rechecked</option>
                  <option value="VALID">Valid</option>
                  <option value="INVALID">Invalid</option>
                  <option value="BOUNCE">Bounce</option>
                </select>
              </div>
              <div>
                <label htmlFor="cw-edit-contact_phone_status" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Phone status
                </label>
                <select
                  name="contact_phone_status" id="cw-edit-contact_phone_status"
                  value={formData.contact_phone_status}
                  onChange={handleChange}
                  className={
                    getInputClass("contact_phone_status") + " bg-white"
                  }
                >
                  <option value="GENERATED">Generated</option>
                  <option value="NOT_FOUND">Not Found</option>
                  <option value="PENDING">Pending</option>
                  <option value="RECHECKED">Rechecked</option>
                  <option value="VALID">Valid</option>
                  <option value="INVALID">Invalid</option>
                  <option value="BOUNCE">Bounce</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label htmlFor="cw-edit-contact_segment" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Segment
                </label>
                <input
                  type="text"
                  name="contact_segment" id="cw-edit-contact_segment"
                  value={formData.contact_segment}
                  onChange={handleChange}
                  className={getInputClass("contact_segment")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_level_field" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Level Field
                </label>
                <input
                  type="text"
                  name="contact_level_field" id="cw-edit-contact_level_field"
                  value={formData.contact_level_field}
                  onChange={handleChange}
                  className={getInputClass("contact_level_field")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_tpid" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  TPID
                </label>
                <input
                  type="text"
                  name="contact_tpid" id="cw-edit-contact_tpid"
                  value={formData.contact_tpid}
                  onChange={handleChange}
                  className={getInputClass("contact_tpid")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_employee_size" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Employee Size
                </label>
                <input
                  type="text"
                  name="contact_employee_size" id="cw-edit-contact_employee_size"
                  value={formData.contact_employee_size}
                  onChange={handleChange}
                  className={getInputClass("contact_employee_size")}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Logistics & Location */}
          <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
            <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-navy rounded-full"></span>}
              Logistics & Location
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_city" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="contact_city" id="cw-edit-contact_city"
                  value={formData.contact_city}
                  onChange={handleChange}
                  className={getInputClass("contact_city")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_state" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="contact_state" id="cw-edit-contact_state"
                  value={formData.contact_state}
                  onChange={handleChange}
                  className={getInputClass("contact_state")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_country" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Country
                </label>
                <input
                  type="text"
                  name="contact_country" id="cw-edit-contact_country"
                  value={formData.contact_country}
                  onChange={handleChange}
                  className={getInputClass("contact_country")}
                />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">
              Pickup Details
            </h4>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="cw-edit-contact_pickup_date" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Pickup Date
                </label>
                <input
                  type="date"
                  name="contact_pickup_date" id="cw-edit-contact_pickup_date"
                  value={formData.contact_pickup_date}
                  onChange={handleChange}
                  className={getInputClass("contact_pickup_date")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_pickup_time" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Pickup Time
                </label>
                <input
                  type="time"
                  name="contact_pickup_time" id="cw-edit-contact_pickup_time"
                  value={formData.contact_pickup_time}
                  onChange={handleChange}
                  className={getInputClass("contact_pickup_time")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_pickup_location" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Pickup Location
                </label>
                <input
                  type="text"
                  name="contact_pickup_location" id="cw-edit-contact_pickup_location"
                  value={formData.contact_pickup_location}
                  onChange={handleChange}
                  className={getInputClass("contact_pickup_location")}
                />
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">
              Drop Details
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="cw-edit-contact_drop_date" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Drop Date
                </label>
                <input
                  type="date"
                  name="contact_drop_date" id="cw-edit-contact_drop_date"
                  value={formData.contact_drop_date}
                  onChange={handleChange}
                  className={getInputClass("contact_drop_date")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_drop_time" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Drop Time
                </label>
                <input
                  type="time"
                  name="contact_drop_time" id="cw-edit-contact_drop_time"
                  value={formData.contact_drop_time}
                  onChange={handleChange}
                  className={getInputClass("contact_drop_time")}
                />
              </div>
              <div>
                <label htmlFor="cw-edit-contact_drop_location" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Drop Location
                </label>
                <input
                  type="text"
                  name="contact_drop_location" id="cw-edit-contact_drop_location"
                  value={formData.contact_drop_location}
                  onChange={handleChange}
                  className={getInputClass("contact_drop_location")}
                />
              </div>
            </div>
          </div>

          {/* Section 6: Addresses */}
          <div className={`grid grid-cols-2 gap-6 ${workspaceMotion?"cw-contact-address-grid":""}`}>
            <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
              <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                {!workspaceMotion&&<span className="w-1.5 h-4 bg-vsph-navy rounded-full"></span>}
                Billing Address
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cw-edit-billing_street" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Street
                  </label>
                  <input
                    type="text"
                    name="billing_street" id="cw-edit-billing_street"
                    value={formData.billing_street}
                    onChange={handleChange}
                    className={getInputClass("billing_street")}
                    placeholder="Street"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cw-edit-billing_city" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="billing_city" id="cw-edit-billing_city"
                      value={formData.billing_city}
                      onChange={handleChange}
                      className={getInputClass("billing_city")}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label htmlFor="cw-edit-billing_state" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="billing_state" id="cw-edit-billing_state"
                      value={formData.billing_state}
                      onChange={handleChange}
                      className={getInputClass("billing_state")}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cw-edit-billing_zip" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Zip
                    </label>
                    <input
                      type="text"
                      name="billing_zip" id="cw-edit-billing_zip"
                      value={formData.billing_zip}
                      onChange={handleChange}
                      className={getInputClass("billing_zip")}
                      placeholder="Zip"
                    />
                  </div>
                  <div>
                    <label htmlFor="cw-edit-billing_country" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="billing_country" id="cw-edit-billing_country"
                      value={formData.billing_country}
                      onChange={handleChange}
                      className={getInputClass("billing_country")}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={workspaceMotion?"cw-contact-section":"bg-vsph-grey p-5 rounded-lg border border-slate-200"}>
              <h3 className="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                {!workspaceMotion&&<span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>}
                Shipping Address
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="cw-edit-shipping_street" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    Street
                  </label>
                  <input
                    type="text"
                    name="shipping_street" id="cw-edit-shipping_street"
                    value={formData.shipping_street}
                    onChange={handleChange}
                    className={getInputClass("shipping_street")}
                    placeholder="Street"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cw-edit-shipping_city" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="shipping_city" id="cw-edit-shipping_city"
                      value={formData.shipping_city}
                      onChange={handleChange}
                      className={getInputClass("shipping_city")}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label htmlFor="cw-edit-shipping_state" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="shipping_state" id="cw-edit-shipping_state"
                      value={formData.shipping_state}
                      onChange={handleChange}
                      className={getInputClass("shipping_state")}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cw-edit-shipping_zip" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Zip
                    </label>
                    <input
                      type="text"
                      name="shipping_zip" id="cw-edit-shipping_zip"
                      value={formData.shipping_zip}
                      onChange={handleChange}
                      className={getInputClass("shipping_zip")}
                      placeholder="Zip"
                    />
                  </div>
                  <div>
                    <label htmlFor="cw-edit-shipping_country" className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="shipping_country" id="cw-edit-shipping_country"
                      value={formData.shipping_country}
                      onChange={handleChange}
                      className={getInputClass("shipping_country")}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default function AddContactModal(props){
  if(!props.isOpen)return null;
  return <ContactForm key={props.contactToEdit?.contact_id||props.defaultAccountId||"new"} {...props}/>;
}
