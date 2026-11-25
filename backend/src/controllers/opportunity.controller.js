import { prisma } from "../lib/prisma.js";
import { getTenantFilter } from "../middleware/auth.middleware.js";
import { opportunityWrite, opportunityRelations } from "../lib/crmWrites.js";

export const getOpportunities = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", stage = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {
      ...getTenantFilter(req, "opportunity_owner_fk"),
    };
    if (search) {
      where.OR = [{ opportunity_name: { contains: search } }];
    }
    if (stage) {
      where.opportunity_stage = stage;
    }

    const [opportunities, totalRecords] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take,
        orderBy: { opportunity_created_at: "desc" },
        include: {
          opportunity_owner: { select: { user_name: true } },
          opportunity_account: { select: { account_name: true } },
          opportunity_contact: {
            select: { contact_firstname: true, contact_lastname: true },
          },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    console.log("Opportunities Fetched Successfully");

    res.status(200).json({
      success: true,
      data: opportunities,
      pagination: {
        totalRecords,
        currentPage: Number(page),
        totalPages: Math.ceil(totalRecords / take),
      },
    });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

// GET /api/opportunities/:id
export const getOpportunityById = async (req, res) => {
  try {
    const { id } = req.params;

    const opportunity = await prisma.opportunity.findUnique({
      where: { opportunity_id: id, ...getTenantFilter(req) },
      include: {
        opportunity_owner: { select: { user_name: true } },
        opportunity_account: { select: { account_name: true } },
        opportunity_contact: { select: { contact_firstname: true, contact_lastname: true } },
      },
    });

    if (!opportunity) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    res.status(200).json({ success: true, data: opportunity });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

async function checkRelations(data,tenantId){
  for(const [field,[model,key,deleted]] of Object.entries(opportunityRelations)){
    if(!data[field])continue;
    const linked=await prisma[model].findFirst({where:{[key]:data[field],tenant_fk:tenantId,...(deleted?{[deleted]:null}:{})},select:{[key]:true}});
    if(!linked)return "Invalid organization reference: "+field;
  }
  return null;
}
export const createOpportunity = async (req,res)=>{
  try{
    const tenantId=req.user.role==="SUPER_ADMIN"?req.body.tenant_fk:req.user.tenantFk;
    if(!tenantId)return res.status(400).json({success:false,message:"No tenant context."});
    const result=opportunityWrite(req.body);
    if(result.error)return res.status(400).json({success:false,message:result.error});
    const error=await checkRelations(result.data,tenantId);
    if(error)return res.status(400).json({success:false,message:error});
    const data=await prisma.opportunity.create({data:{...result.data,tenant_fk:tenantId}});
    res.status(201).json({success:true,message:"Opportunity created",data});
  }catch(error){
    console.error("Error creating opportunity:",error);
    res.status(500).json({success:false,message:"Could not create opportunity."});
  }
};
export const updateOpportunity = async (req,res)=>{
  try{
    const where={opportunity_id:req.params.id,...getTenantFilter(req)};
    const existing=await prisma.opportunity.findFirst({where});
    if(!existing)return res.status(404).json({success:false,message:"Opportunity not found."});
    const result=opportunityWrite(req.body,existing);
    if(result.error)return res.status(400).json({success:false,message:result.error});
    const error=await checkRelations(result.data,existing.tenant_fk);
    if(error)return res.status(400).json({success:false,message:error});
    const data=await prisma.opportunity.update({where:{...where,tenant_fk:existing.tenant_fk},data:result.data});
    res.json({success:true,message:"Opportunity updated",data});
  }catch(error){
    console.error("Error updating opportunity:",error);
    res.status(500).json({success:false,message:"Could not update opportunity."});
  }
};

// DELETE /api/opportunities/:id
export const deleteOpportunity = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.opportunity.deleteMany({
      where: { opportunity_id: id, ...getTenantFilter(req) },
    });

    if (!deleted.count) {
      return res.status(404).json({ success: false, message: "Opportunity not found" });
    }

    res.status(200).json({ success: true, message: "Opportunity deleted" });
  } catch (error) {
    console.error("Error deleting opportunity:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};
