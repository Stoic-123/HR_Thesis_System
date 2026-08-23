import { PrismaClient } from "@prisma/client";
import { createNotification, notifyAdmins } from "../service/Notification.js";
import { validateFile } from "../utils/fileValidation.js";
import { uploadToStorage, deleteFromStorage } from "../service/Storage.js";
const prisma = new PrismaClient();

// ==========================================
// CATEGORY
// ==========================================
const getCategories = async (req, res) => {
  try {
    const categories = await prisma.assetcategory.findMany({
      where: { company_id: req.user.company_id },
      include: {
        _count: {
          select: {
            asset: true,
            assetrequest: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ result: true, data: categories });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await prisma.assetcategory.create({
      data: {
        company_id: req.user.company_id,
        name,
        description
      }
    });
    res.status(201).json({ result: true, data: category });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const categoryId = parseInt(id);

    const category = await prisma.assetcategory.findFirst({
      where: { id: categoryId, company_id: req.user.company_id },
      include: {
        _count: {
          select: {
            asset: true,
            assetrequest: true,
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ result: false, message: "Category not found" });
    }

    if (category._count.asset > 0) {
      return res.status(400).json({
        result: false,
        message: `Cannot delete category because it is currently assigned to ${category._count.asset} asset(s). Please delete or reassign those assets first.`
      });
    }

    if (category._count.assetrequest > 0) {
      return res.status(400).json({
        result: false,
        message: `Cannot delete category because it is linked to ${category._count.assetrequest} asset request(s).`
      });
    }

    await prisma.assetcategory.delete({
      where: { id: categoryId }
    });

    res.status(200).json({ result: true, message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

// ==========================================
// ASSET
// ==========================================
const getAssets = async (req, res) => {
  try {
    const assets = await prisma.asset.findMany({
      where: { company_id: req.user.company_id },
      include: {
        category: true,
        employee: true,
        assethistory: {
          include: {
            employee: true
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ result: true, data: assets });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const { category_id, name, serial_number, condition } = req.body;

    let image_path = null;
    if (req.files && req.files.image_path) {
      const fileCheck = validateFile(req.files.image_path, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const image = req.files.image_path;
      const imageName = Date.now() + "_" + image.name;
      image_path = await uploadToStorage(image.data, "assets", imageName, image.mimetype);
    }

    let targetSerialNumber = serial_number;
    if (!targetSerialNumber) {
      const category = await prisma.assetcategory.findUnique({ where: { id: parseInt(category_id) } });
      const prefix = category ? category.name.substring(0, 2).toLowerCase() : "as";
      const prefixWithDash = prefix + "-";

      const categoryAssets = await prisma.asset.findMany({
        where: {
          company_id: req.user.company_id,
          category_id: parseInt(category_id),
          serial_number: { startsWith: prefixWithDash }
        }
      });

      let maxNum = 0;
      categoryAssets.forEach(a => {
        const suffix = a.serial_number.substring(prefixWithDash.length);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      });
      targetSerialNumber = `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
    }

    const asset = await prisma.asset.create({
      data: {
        company_id: req.user.company_id,
        category_id: parseInt(category_id),
        name,
        serial_number: targetSerialNumber,
        condition: condition || 'good',
        status: 'available',
        image_path
      }
    });
    res.status(201).json({ result: true, data: asset });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

// ==========================================
// ASSIGNMENT (Direct)
// ==========================================
const directAssign = async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_id, condition_out } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    if (!asset) return res.status(404).json({ result: false, message: "Asset not found" });
    if (asset.status !== 'available') return res.status(400).json({ result: false, message: "Asset is not available" });

    // Update Asset
    const updated = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: {
        status: 'assigned',
        assigned_to: parseInt(employee_id),
        assigned_date: new Date(),
        condition: condition_out || asset.condition
      }
    });

    // Create history record
    await prisma.assethistory.create({
      data: {
        asset_id: parseInt(id),
        company_id: req.user.company_id,
        previous_assignee_id: parseInt(employee_id),
        condition_out: condition_out || asset.condition,
        assigned_date: new Date()
      }
    });

    // Resolve any pending requests of the same category for this employee
    const pendingRequest = await prisma.assetrequest.findFirst({
      where: {
        requested_by: parseInt(employee_id),
        category_id: asset.category_id,
        status: { in: ['pending_manager', 'pending_hr'] }
      }
    });
    if (pendingRequest) {
      await prisma.assetrequest.update({
        where: { id: pendingRequest.id },
        data: {
          status: 'assigned',
          asset_id: asset.id
        }
      });
    }

    res.status(200).json({ result: true, data: updated, message: "Asset assigned successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

// ==========================================
// RETURN
// ==========================================
const confirmReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { condition_in, return_status } = req.body; // return_status = 'available' or 'under_repair'

    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    if (!asset || asset.status !== 'assigned') {
      return res.status(400).json({ result: false, message: "Asset not currently assigned" });
    }

    const previous_assignee_id = asset.assigned_to;

    // Update Asset
    const updated = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: {
        status: return_status || 'available',
        assigned_to: null,
        assigned_date: null,
        condition: condition_in || asset.condition
      }
    });

    // Find the latest history and update returned_date and condition_in
    const history = await prisma.assethistory.findFirst({
      where: {
        asset_id: parseInt(id),
        previous_assignee_id: previous_assignee_id,
        returned_date: null
      },
      orderBy: { created_at: 'desc' }
    });

    if (history) {
      await prisma.assethistory.update({
        where: { id: history.id },
        data: {
          condition_in: condition_in || asset.condition,
          returned_date: new Date()
        }
      });
    }

    // Update any assignment request for this asset to 'available' (Returned)
    const activeRequest = await prisma.assetrequest.findFirst({
      where: {
        asset_id: asset.id,
        requested_by: previous_assignee_id,
        status: 'assigned'
      }
    });
    if (activeRequest) {
      await prisma.assetrequest.update({
        where: { id: activeRequest.id },
        data: { status: 'available' }
      });
    }

    res.status(200).json({ result: true, data: updated, message: "Asset returned successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

// ==========================================
// REQUESTS
// ==========================================
const getRequests = async (req, res) => {
  try {
    const requests = await prisma.assetrequest.findMany({
      where: { company_id: req.user.company_id },
      include: {
        employee: true,
        manager: true,
        category: true,
        asset: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ result: true, data: requests });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const getRequestsMobile = async (req, res) => {
  try {
    const employee_id = req.user.employee_id;
    // Get requests made by the employee, or where employee is the manager
    const requests = await prisma.assetrequest.findMany({
      where: {
        company_id: req.user.company_id,
        OR: [
          { requested_by: employee_id },
          { manager_id: employee_id }
        ]
      },
      include: {
        employee: true,
        manager: true,
        category: true,
        asset: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.status(200).json({ result: true, data: requests });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const createRequest = async (req, res) => {
  try {
    const { type, category_id, asset_id, reason } = req.body;
    const employee_id = req.user.employee_id;

    // Find the employee's manager (department manager)
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      include: { department_employee_department_idTodepartment: true }
    });
    
    let manager_id = employee?.department_employee_department_idTodepartment?.manager_id;

    const request = await prisma.assetrequest.create({
      data: {
        company_id: req.user.company_id,
        requested_by: employee_id,
        category_id: category_id ? parseInt(category_id) : null,
        asset_id: asset_id ? parseInt(asset_id) : null,
        type: type || 'assignment',
        reason,
        status: manager_id ? 'pending_manager' : 'pending_hr',
        manager_id: manager_id || null
      }
    });

    // Send Database & Socket.io notifications
    try {
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      const title = "New Asset Request";
      const body = `${employeeName} requested an asset (${type || 'assignment'}).`;
      
      if (manager_id) {
        const managerUser = await prisma.user.findFirst({ where: { employee_id: manager_id } });
        if (managerUser) {
          await createNotification(req.user.company_id, title, body, managerUser.id, request.id);
        }
      } else {
        await notifyAdmins(req.user.company_id, title, body, request.id);
      }
    } catch (e) {
      console.error("[Asset Request Notification Error]", e.message);
    }

    res.status(201).json({ result: true, data: request, message: "Request submitted" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const approveManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, manager_comment } = req.body; // action = 'approve' or 'reject'

    const request = await prisma.assetrequest.findUnique({ where: { id: parseInt(id) } });
    if (!request) return res.status(404).json({ result: false, message: "Request not found" });

    const status = action === 'approve' ? 'pending_hr' : 'rejected'; // If rejected, we might need a status for that or just set 'retired' etc. Actually, let's use a custom or just don't have rejected in enum? Wait, the enum asset_status doesn't have 'rejected'. Let's reuse 'available' or add 'rejected'? Wait, the schema didn't add rejected to asset_status. Let's just assume we delete it or set it back?
    // Actually, asset_status: available, pending_manager, pending_hr, assigned, under_repair, retired.
    // If manager rejects, maybe we delete the request? Or maybe we just can't set it to rejected. Let's delete it for now if rejected.
    
    if (action === 'reject') {
      // Notify employee before deleting the request
      try {
        const empUser = await prisma.user.findFirst({ where: { employee_id: request.requested_by } });
        if (empUser) {
          await createNotification(request.company_id, "Asset Request Rejected", "Your asset request was rejected by your manager.", empUser.id, request.id);
        }
      } catch (e) {
        console.error("[Asset Manager Rejection Notification Error]", e.message);
      }

      await prisma.assetrequest.delete({ where: { id: parseInt(id) } });
      return res.status(200).json({ result: true, message: "Request rejected and deleted" });
    }

    const updated = await prisma.assetrequest.update({
      where: { id: parseInt(id) },
      data: {
        status: 'pending_hr',
        manager_comment
      },
      include: {
        employee: true
      }
    });

    // Notify HR admins
    try {
      const employeeName = `${updated.employee?.first_name} ${updated.employee?.last_name}`;
      await notifyAdmins(request.company_id, "Asset Request Approved by Manager", `Asset request for ${employeeName} is pending HR approval.`, request.id);
    } catch (e) {
      console.error("[Asset Manager Approval Notification Error]", e.message);
    }

    res.status(200).json({ result: true, data: updated, message: "Request approved by manager" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const approveHR = async (req, res) => {
  try {
    const { id } = req.params;
    const { asset_id, hr_comment, condition_out } = req.body; 

    const request = await prisma.assetrequest.findUnique({ where: { id: parseInt(id) } });
    if (!request) return res.status(404).json({ result: false, message: "Request not found" });

    if (request.type === 'assignment') {
      if (!asset_id) return res.status(400).json({ result: false, message: "Asset ID is required to approve assignment" });
      
      const asset = await prisma.asset.findUnique({ where: { id: parseInt(asset_id) } });
      if (!asset || asset.status !== 'available') return res.status(400).json({ result: false, message: "Selected asset is not available" });

      // Update Asset
      await prisma.asset.update({
        where: { id: parseInt(asset_id) },
        data: {
          status: 'assigned',
          assigned_to: request.requested_by,
          assigned_date: new Date(),
          condition: condition_out || asset.condition
        }
      });

      // Create history
      await prisma.assethistory.create({
        data: {
          asset_id: parseInt(asset_id),
          company_id: req.user.company_id,
          previous_assignee_id: request.requested_by,
          condition_out: condition_out || asset.condition,
          assigned_date: new Date()
        }
      });

      // Update Request
      const updatedReq = await prisma.assetrequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'assigned',
          asset_id: parseInt(asset_id),
          hr_comment
        }
      });

      // Notify employee
      try {
        const empUser = await prisma.user.findFirst({ where: { employee_id: request.requested_by } });
        if (empUser) {
          await createNotification(req.user.company_id, "Asset Allocated", "Your asset request has been approved and allocated.", empUser.id, request.id);
        }
      } catch (e) {
        console.error("[Asset HR Approval Notification Error]", e.message);
      }

      return res.status(200).json({ result: true, data: updatedReq, message: "Request approved and asset assigned" });
    } else {
      // It's a return request
      const asset_id_to_return = request.asset_id;
      
      await prisma.asset.update({
        where: { id: parseInt(asset_id_to_return) },
        data: {
          status: 'available',
          assigned_to: null,
          assigned_date: null
        }
      });

      const history = await prisma.assethistory.findFirst({
        where: {
          asset_id: parseInt(asset_id_to_return),
          previous_assignee_id: request.requested_by,
          returned_date: null
        },
        orderBy: { created_at: 'desc' }
      });

      if (history) {
        await prisma.assethistory.update({
          where: { id: history.id },
          data: {
            condition_in: 'good',
            returned_date: new Date()
          }
        });
      }

      const updatedReq = await prisma.assetrequest.update({
        where: { id: parseInt(id) },
        data: {
          status: 'available', // returned
          hr_comment
        }
      });

      // Notify employee
      try {
        const empUser = await prisma.user.findFirst({ where: { employee_id: request.requested_by } });
        if (empUser) {
          await createNotification(req.user.company_id, "Asset Return Confirmed", "Your asset return request has been confirmed.", empUser.id, request.id);
        }
      } catch (e) {
        console.error("[Asset HR Return Confirm Notification Error]", e.message);
      }

      return res.status(200).json({ result: true, data: updatedReq, message: "Return request confirmed" });
    }
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, serial_number, condition, status, assigned_to } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    if (!asset) return res.status(404).json({ result: false, message: "Asset not found" });

    let image_path = asset.image_path;
    if (req.files && req.files.image_path) {
      const fileCheck = validateFile(req.files.image_path, "image");
      if (!fileCheck.isValid) {
        return res.status(400).json({ result: false, message: fileCheck.message });
      }
      const image = req.files.image_path;
      const imageName = Date.now() + "_" + image.name;
      // Delete old image from R2 before uploading new one
      if (asset.image_path) await deleteFromStorage(asset.image_path);
      image_path = await uploadToStorage(image.data, "assets", imageName, image.mimetype);
    }

    let targetStatus = status !== undefined ? status : asset.status;
    let targetAssignedTo = assigned_to !== undefined ? (assigned_to ? parseInt(assigned_to) : null) : asset.assigned_to;
    let targetAssignedDate = asset.assigned_date;

    // 1. If we change status to 'under_repair' or 'retired' (Broken), we MUST auto-return it if it is currently assigned.
    if ((targetStatus === "under_repair" || targetStatus === "retired") && asset.assigned_to) {
      const previous_assignee_id = asset.assigned_to;
      targetAssignedTo = null;
      targetAssignedDate = null;

      // Find the latest active history record and update it
      const history = await prisma.assethistory.findFirst({
        where: {
          asset_id: asset.id,
          previous_assignee_id: previous_assignee_id,
          returned_date: null
        },
        orderBy: { created_at: 'desc' }
      });
      if (history) {
        await prisma.assethistory.update({
          where: { id: history.id },
          data: {
            condition_in: condition || asset.condition,
            returned_date: new Date()
          }
        });
      }

      // Update any active assignment request for this asset to 'available' (Returned)
      const activeRequest = await prisma.assetrequest.findFirst({
        where: {
          asset_id: asset.id,
          requested_by: previous_assignee_id,
          status: 'assigned'
        }
      });
      if (activeRequest) {
        await prisma.assetrequest.update({
          where: { id: activeRequest.id },
          data: { status: 'available' }
        });
      }
    }

    // 2. If we change status from 'under_repair' back to active ('available' / 'assigned'):
    if (asset.status === "under_repair" && (targetStatus === "available" || targetStatus === "assigned")) {
      // Find the last person who handled this asset (the latest assethistory record)
      const lastHistory = await prisma.assethistory.findFirst({
        where: { asset_id: asset.id },
        orderBy: { created_at: 'desc' }
      });

      if (lastHistory) {
        // Auto-assign back to that employee
        targetStatus = "assigned";
        targetAssignedTo = lastHistory.previous_assignee_id;
        targetAssignedDate = new Date();

        // Create a new assignment history record
        await prisma.assethistory.create({
          data: {
            asset_id: asset.id,
            company_id: req.user.company_id,
            previous_assignee_id: lastHistory.previous_assignee_id,
            condition_out: condition || asset.condition,
            assigned_date: new Date()
          }
        });
      } else {
        // No previous handler, just make it available
        targetStatus = "available";
        targetAssignedTo = null;
        targetAssignedDate = null;
      }
    }

    const updated = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: {
        category_id: category_id ? parseInt(category_id) : asset.category_id,
        name: name !== undefined ? name : asset.name,
        serial_number: serial_number !== undefined ? serial_number : asset.serial_number,
        condition: condition !== undefined ? condition : asset.condition,
        status: targetStatus,
        assigned_to: targetAssignedTo,
        assigned_date: targetAssignedDate,
        image_path
      }
    });

    res.status(200).json({ result: true, data: updated, message: "Asset updated successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(id) } });
    if (!asset) return res.status(404).json({ result: false, message: "Asset not found" });

    await prisma.asset.delete({ where: { id: parseInt(id) } });
    res.status(200).json({ result: true, message: "Asset deleted successfully" });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

const deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = parseInt(id);

    const request = await prisma.assetrequest.findFirst({
      where: { id: requestId, company_id: req.user.company_id },
    });

    if (!request) {
      return res.status(404).json({ result: false, message: "Asset request not found." });
    }

    await prisma.assetrequest.delete({
      where: { id: requestId },
    });

    res.status(200).json({ result: true, message: "Asset request deleted successfully." });
  } catch (error) {
    res.status(500).json({ result: false, message: error.message });
  }
};

export default {
  getCategories,
  createCategory,
  deleteCategory,
  getAssets,
  createAsset,
  directAssign,
  confirmReturn,
  getRequests,
  getRequestsMobile,
  createRequest,
  approveManager,
  approveHR,
  updateAsset,
  deleteAsset,
  deleteRequest,
};
