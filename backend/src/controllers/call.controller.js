import { prisma } from "../lib/prisma.js";
import { getTenantFilter } from "../middleware/auth.middleware.js";
import { canDoAction } from "../lib/modules.js";
import { canAssignTaskTo } from "../lib/tasks.js";
import { callWrite } from "../lib/crmWrites.js";
import { CALL_OUTCOMES, validateFollowup } from "../lib/contactActivities.js";

export const createCall = async (req, res) => {
  try {
    const { call_contact_fk, call_subject, call_description, call_outcome, followup, mark_do_not_call } = req.body;
    const checked=callWrite(req.body);
    if(checked.error||!checked.data.call_subject||!checked.data.call_description)return res.status(400).json({success:false,message:checked.error||"Subject and notes are required."});
    if(mark_do_not_call===true&&(call_outcome!=="DNC"||!call_contact_fk||!canDoAction(req.user,"CONTACTS","EDIT")))return res.status(403).json({success:false,message:"Updating do-not-call requires contact editing access and a DNC outcome."});
    if (call_outcome != null && !CALL_OUTCOMES.includes(call_outcome)) return res.status(400).json({success:false,message:"Invalid call outcome."});
    if (followup && (!call_contact_fk || !canDoAction(req.user,"TASKS","CREATE"))) return res.status(403).json({success:false,message:"Follow-up requires task creation access and a linked contact."});

    // Resolve tenant: client users always use their own tenant; superadmin may specify one
    let tenantId = req.user.tenantFk;
    if (req.user.role === "SUPER_ADMIN" && req.body.tenant_fk) {
      tenantId = req.body.tenant_fk;
    }
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: "No tenant context. Client users are auto-assigned; superadmin must provide tenant_fk.",
      });
    }

    // Attribute the call to the signed-in user; only platform superadmins may
    // log on behalf of someone else.
    const callUserId =
      req.user.role === "SUPER_ADMIN" && req.body.call_user_fk
        ? req.body.call_user_fk
        : req.user.id;

    if(callUserId!==req.user.id&&!await prisma.user.findFirst({where:{user_id:callUserId,tenant_fk:tenantId,user_deleted_at:null},select:{user_id:true}}))return res.status(400).json({success:false,message:"Invalid call author."});
    // A call may only link to a contact inside the same organization.
    if (call_contact_fk) {
      const contact = await prisma.contact.findFirst({
        where: { contact_id: call_contact_fk, tenant_fk: tenantId, contact_deleted_at: null },
        select: { contact_id: true },
      });
      if (!contact) {
        return res.status(400).json({ success: false, error: "Contact not found in this organization" });
      }
    }

    let taskData = null;
    if (followup) {
      const validation = validateFollowup(followup);
      if (validation.error) return res.status(400).json({success:false,message:validation.error});
      const target = await prisma.user.findFirst({
        where: {user_id:validation.data.task_user_fk,tenant_fk:tenantId,user_deleted_at:null,user_status:true},
      });
      if (!target || !canAssignTaskTo(req.user,target)) return res.status(403).json({success:false,message:"You cannot assign this follow-up to that user."});
      taskData = {...validation.data,tenant_fk:tenantId,task_contact_fk:call_contact_fk,task_assigned_by_fk:req.user.id,task_status:"TODO",task_priority:"NORMAL"};
    }
    const callData = {tenant_fk:tenantId,call_user_fk:callUserId,call_contact_fk,call_subject,call_description,call_outcome:call_outcome ?? null};
    // The call and its follow-up either both commit or neither does.
    const result = await prisma.$transaction(async tx => {
      const newCall = await tx.call.create({data:{...callData,...checked.data}});
      if(mark_do_not_call===true)await tx.contact.update({where:{contact_id:call_contact_fk,tenant_fk:tenantId,contact_deleted_at:null},data:{contact_call_status:"DNC"}});
      if (!taskData) return newCall;
      const followupTask = await tx.task.create({data:{...taskData,task_call_fk:newCall.call_id},include:{user:{select:{user_id:true,user_name:true,user_role:true}}}});
      return {...newCall,followup_task:followupTask};
    });
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating call:", error);
    res.status(500).json({ error: "Failed to create call" });
  }
};

export const getCalls = async (req, res) => {
  try {
    const { contact_id } = req.query;

    const query = {
      where: { call_deleted_at: null, ...getTenantFilter(req, "call_user_fk") },
      include: {
        user: { select: { user_id: true, user_name: true } },
      },
      orderBy: { call_created_at: "desc" },
    };

    if (contact_id) {
      query.where.call_contact_fk = contact_id;
    }

    const calls = await prisma.call.findMany(query);
    res.status(200).json(calls);
  } catch (error) {
    console.error("Error fetching calls:", error);
    res.status(500).json({ error: "Failed to fetch calls" });
  }
};

export const getCallById = async (req, res) => {
  try {
    const { id } = req.params;

    const call = await prisma.call.findUnique({
      where: { call_id: id, ...getTenantFilter(req) },
      include: {
        user: { select: { user_id: true, user_name: true } },
        contact: { select: { contact_id: true, contact_firstname: true, contact_lastname: true } },
        call_tasks: true,
      },
    });

    if (!call || call.call_deleted_at) {
      return res.status(404).json({ error: "Call not found" });
    }

    res.status(200).json(call);
  } catch (error) {
    console.error("Error fetching call:", error);
    res.status(500).json({ error: "Failed to fetch call" });
  }
};

export const updateCall = async (req, res) => {
  try {
    const { id } = req.params;
    const validated=callWrite(req.body);
    if(validated.error)return res.status(400).json({success:false,message:validated.error});
    const updateData=validated.data;

    const updatedCall = await prisma.call.update({
      where: { call_id: id, call_deleted_at:null, ...getTenantFilter(req) },
      data: updateData,
    });

    res.status(200).json(updatedCall);
  } catch (error) {
    console.error("Error updating call:", error);
    res.status(500).json({ error: "Failed to update call" });
  }
};

export const deleteCall = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete
    await prisma.call.update({
      where: { call_id: id, ...getTenantFilter(req) },
      data: { call_deleted_at: new Date() },
    });

    res.status(200).json({ message: "Call deleted successfully" });
  } catch (error) {
    console.error("Error deleting call:", error);
    res.status(500).json({ error: "Failed to delete call" });
  }
};
