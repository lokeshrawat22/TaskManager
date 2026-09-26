import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import AuditLog from "../models/auditLog.model.js";
import Notification from "../models/notification.model.js";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  normalizeRole,
} from "../constants/rbac.constants.js";
import { DEPARTMENTS } from "../constants/employee.constants.js";
import Department from "../models/department.model.js";
import Designation from "../models/designation.model.js";
import { auditLog } from "../utils/auditLogger.js";

// =====================================================
// 1. GET ALL ADMINISTRATORS
// =====================================================

export const getAdministrators = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const administrators = await User.find({
      role: { $in: ["super_admin", "administrator", "admin"] },
    })
      .select(
        "_id firstName lastName email phone role isBlocked department designation createdAt updatedAt profilePhoto",
      )
      .sort({ role: 1, firstName: 1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Administrators fetched successfully",
      data: {
        administrators,
      },
    });
  } catch (error) {
    console.error("Get administrators error:", error);
    next(error);
  }
};

// =====================================================
// 2. CREATE ADMINISTRATOR
// =====================================================

export const createAdministrator = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const requesterRole = normalizeRole(req.user?.role);
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      department,
      designation = "Administrator",
      role = "administrator",
      confirmSuperAdmin = false,
    } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      res.status(400).json({
        success: false,
        message: "First name, last name, email, and password are required.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
      return;
    }

    // Validate department if provided
    let matchedDeptDoc: any = null;
    if (
      department !== undefined &&
      typeof department === "string" &&
      department.trim()
    ) {
      const trimmedDept = department.trim();
      matchedDeptDoc = await Department.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(trimmedDept)
            ? [{ _id: trimmedDept }]
            : []),
          {
            name: {
              $regex: new RegExp(
                `^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          },
        ],
      });

      if (!matchedDeptDoc && !DEPARTMENTS.includes(trimmedDept)) {
        res.status(400).json({
          success: false,
          message: "Invalid department selected.",
        });
        return;
      }
    }

    // Determine target role
    const requestedTargetRole = String(role).toLowerCase().trim();
    let finalRole: "administrator" | "super_admin" = "administrator";

    if (requestedTargetRole === "super_admin") {
      // Privilege escalation check: Only Super Admin can assign Super Admin role
      if (requesterRole !== ROLES.SUPER_ADMIN) {
        auditLog("SECURITY_EVENT", "DENIED", req, {
          userId: req.user?.userId,
          role: req.user?.role,
          details: {
            reason: "Non-super-admin attempted to create Super Admin account",
            targetEmail: normalizedEmail,
          },
        });
        res.status(403).json({
          success: false,
          message:
            "Only a Super Administrator can create another Super Administrator account.",
        });
        return;
      }

      if (!confirmSuperAdmin) {
        res.status(400).json({
          success: false,
          message:
            "Explicit confirmation is required to assign Super Administrator privileges.",
        });
        return;
      }

      finalRole = "super_admin";
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || undefined,
      department: matchedDeptDoc
        ? matchedDeptDoc.name
        : department?.trim() || undefined,
      departmentId: matchedDeptDoc ? matchedDeptDoc._id : undefined,
      designation:
        designation?.trim() ||
        (finalRole === "super_admin" ? "Super Administrator" : "Administrator"),
      role: finalRole,
      isEmailVerified: true,
      isBlocked: false,
    });

    auditLog(
      finalRole === "super_admin" ? "SUPER_ADMIN_ASSIGNED" : "ADMIN_CREATED",
      "SUCCESS",
      req,
      {
        userId: req.user?.userId,
        role: req.user?.role,
        details: {
          createdUserId: newAdmin._id.toString(),
          createdEmail: newAdmin.email,
          createdRole: finalRole,
        },
      },
    );

    res.status(201).json({
      success: true,
      message: `${ROLE_LABELS[finalRole]} created successfully.`,
      data: {
        administrator: {
          _id: newAdmin._id,
          firstName: newAdmin.firstName,
          lastName: newAdmin.lastName,
          email: newAdmin.email,
          phone: newAdmin.phone,
          role: newAdmin.role,
          department: newAdmin.department,
          designation: newAdmin.designation,
          createdAt: newAdmin.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create administrator error:", error);
    next(error);
  }
};

// =====================================================
// 3. UPDATE ADMINISTRATOR
// =====================================================

export const updateAdministrator = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterRole = normalizeRole(req.user?.role);
    const requesterId = req.user?.userId;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Valid administrator ID is required.",
      });
      return;
    }

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
      return;
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      department,
      designation,
      role,
      confirmRoleChange,
    } = req.body;

    // Safety: Only Super Admin can modify another Super Admin account
    if (
      normalizeRole(targetAdmin.role) === ROLES.SUPER_ADMIN &&
      requesterRole !== ROLES.SUPER_ADMIN
    ) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requesterId,
        role: req.user?.role,
        details: {
          reason: "Administrator attempted to modify a Super Admin account",
          targetId: id,
        },
      });
      res.status(403).json({
        success: false,
        message:
          "You do not have permission to modify a Super Administrator account.",
      });
      return;
    }

    // Role change requested
    if (role !== undefined && role !== targetAdmin.role) {
      const normalizedNewRole = normalizeRole(role);

      // Only Super Admin can change user roles
      if (requesterRole !== ROLES.SUPER_ADMIN) {
        auditLog("SECURITY_EVENT", "DENIED", req, {
          userId: requesterId,
          role: req.user?.role,
          details: {
            reason: "Non-super-admin attempted to change a user's role",
            targetId: id,
            attemptedRole: role,
          },
        });
        res.status(403).json({
          success: false,
          message: "Only a Super Administrator can change account roles.",
        });
        return;
      }

      // Demoting a Super Admin?
      if (
        normalizeRole(targetAdmin.role) === ROLES.SUPER_ADMIN &&
        normalizedNewRole !== ROLES.SUPER_ADMIN
      ) {
        // Prevent system from ending up with 0 Super Admins
        const activeSuperAdminCount = await User.countDocuments({
          role: "super_admin",
          isBlocked: false,
          _id: { $ne: targetAdmin._id },
        });

        if (activeSuperAdminCount === 0) {
          res.status(400).json({
            success: false,
            message:
              "Cannot demote the only active Super Administrator. Please assign another Super Administrator first.",
          });
          return;
        }

        if (!confirmRoleChange) {
          res.status(400).json({
            success: false,
            message:
              "Confirmation is required to revoke Super Administrator privileges.",
          });
          return;
        }
      }

      const previousRole = targetAdmin.role;
      targetAdmin.role = normalizedNewRole;
      auditLog("ROLE_CHANGED", "SUCCESS", req, {
        userId: requesterId,
        role: req.user?.role,
        details: {
          targetUserId: targetAdmin._id.toString(),
          targetEmail: targetAdmin.email,
          previousRole,
          newRole: normalizedNewRole,
        },
      });
    }

    if (firstName?.trim()) targetAdmin.firstName = firstName.trim();
    if (lastName?.trim()) targetAdmin.lastName = lastName.trim();
    if (phone !== undefined) targetAdmin.phone = phone.trim();
    if (
      department !== undefined &&
      typeof department === "string" &&
      department.trim()
    ) {
      const trimmedDept = department.trim();
      const matchedDeptDoc = await Department.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(trimmedDept)
            ? [{ _id: trimmedDept }]
            : []),
          {
            name: {
              $regex: new RegExp(
                `^${trimmedDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          },
        ],
      });

      if (!matchedDeptDoc && !DEPARTMENTS.includes(trimmedDept)) {
        res.status(400).json({
          success: false,
          message: "Invalid department selected.",
        });
        return;
      }
      targetAdmin.department = matchedDeptDoc
        ? matchedDeptDoc.name
        : trimmedDept;
      if (matchedDeptDoc) {
        targetAdmin.departmentId = matchedDeptDoc._id as any;
      }
    }
    if (designation?.trim()) targetAdmin.designation = designation.trim();

    if (email?.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== targetAdmin.email) {
        const emailConflict = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: targetAdmin._id },
        });
        if (emailConflict) {
          res.status(409).json({
            success: false,
            message: "This email is already in use by another account.",
          });
          return;
        }
        targetAdmin.email = normalizedEmail;
      }
    }

    await targetAdmin.save();

    auditLog("ADMIN_UPDATED", "SUCCESS", req, {
      userId: requesterId,
      role: req.user?.role,
      details: {
        updatedUserId: targetAdmin._id.toString(),
        updatedEmail: targetAdmin.email,
      },
    });

    res.status(200).json({
      success: true,
      message: "Administrator updated successfully.",
      data: {
        administrator: {
          _id: targetAdmin._id,
          firstName: targetAdmin.firstName,
          lastName: targetAdmin.lastName,
          email: targetAdmin.email,
          phone: targetAdmin.phone,
          role: targetAdmin.role,
          department: targetAdmin.department,
          designation: targetAdmin.designation,
          isBlocked: targetAdmin.isBlocked,
          updatedAt: targetAdmin.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update administrator error:", error);
    next(error);
  }
};

// =====================================================
// 4. TOGGLE ADMINISTRATOR BLOCK / DEACTIVATE
// =====================================================

export const toggleAdministratorBlock = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterRole = normalizeRole(req.user?.role);
    const requesterId = req.user?.userId;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Valid administrator ID is required.",
      });
      return;
    }

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
      return;
    }

    // Safety: Cannot block or deactivate self
    if (requesterId && targetAdmin._id.toString() === requesterId.toString()) {
      res.status(400).json({
        success: false,
        message: "You cannot block or deactivate your own account.",
      });
      return;
    }

    // Safety: Super Administrator accounts can NEVER be blocked
    if (normalizeRole(targetAdmin.role) === ROLES.SUPER_ADMIN) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requesterId,
        role: req.user?.role,
        details: {
          reason: "Attempted to deactivate a Super Admin",
          targetId: id,
        },
      });
      res.status(403).json({
        success: false,
        message:
          "Super Administrator accounts cannot be blocked or deactivated.",
      });
      return;
    }

    // Safety: Only Super Administrators can deactivate Administrator accounts
    if (requesterRole !== ROLES.SUPER_ADMIN) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requesterId,
        role: req.user?.role,
        details: {
          reason: "Administrator attempted to deactivate another Administrator",
          targetId: id,
        },
      });
      res.status(403).json({
        success: false,
        message:
          "Only Super Administrators have permission to deactivate Administrator accounts.",
      });
      return;
    }

    targetAdmin.isBlocked = !targetAdmin.isBlocked;
    await targetAdmin.save();

    auditLog(
      targetAdmin.isBlocked ? "ADMIN_BLOCKED" : "ADMIN_UNBLOCKED",
      "SUCCESS",
      req,
      {
        userId: requesterId,
        role: req.user?.role,
        details: {
          targetUserId: targetAdmin._id.toString(),
          targetEmail: targetAdmin.email,
          targetRole: targetAdmin.role,
          action: targetAdmin.isBlocked ? "BLOCKED" : "UNBLOCKED",
          newStatus: targetAdmin.isBlocked ? "Blocked" : "Active",
        },
      },
    );

    try {
      await Notification.create({
        recipient: targetAdmin._id,
        type: targetAdmin.isBlocked ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED",
        title: targetAdmin.isBlocked
          ? "Administrator Account Deactivated"
          : "Administrator Account Reactivated",
        message: targetAdmin.isBlocked
          ? "Your administrator account has been deactivated by the Super Administrator."
          : "Your administrator account has been reactivated by the Super Administrator.",
      });
    } catch (notifErr) {
      console.error("Failed to create admin notification:", notifErr);
    }

    res.status(200).json({
      success: true,
      message: targetAdmin.isBlocked
        ? "Administrator deactivated successfully."
        : "Administrator activated successfully.",
      data: {
        id: targetAdmin._id,
        _id: targetAdmin._id,
        isBlocked: targetAdmin.isBlocked,
        status: targetAdmin.isBlocked ? "BLOCKED" : "ACTIVE",
        employee: {
          id: targetAdmin._id,
          _id: targetAdmin._id,
          isBlocked: targetAdmin.isBlocked,
          status: targetAdmin.isBlocked ? "BLOCKED" : "ACTIVE",
        },
      },
    });
  } catch (error) {
    console.error("Toggle administrator block error:", error);
    next(error);
  }
};

// =====================================================
// 5. DELETE ADMINISTRATOR
// =====================================================

export const deleteAdministrator = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterRole = normalizeRole(req.user?.role);
    const requesterId = req.user?.userId;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Valid administrator ID is required.",
      });
      return;
    }

    const targetAdmin = await User.findById(id);
    if (!targetAdmin) {
      res.status(404).json({
        success: false,
        message: "Administrator not found.",
      });
      return;
    }

    // Safety: Administrator cannot delete Super Admin
    if (
      normalizeRole(targetAdmin.role) === ROLES.SUPER_ADMIN &&
      requesterRole !== ROLES.SUPER_ADMIN
    ) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requesterId,
        role: req.user?.role,
        details: {
          reason: "Administrator attempted to delete a Super Admin",
          targetId: id,
        },
      });
      res.status(403).json({
        success: false,
        message: "You do not have permission to delete a Super Administrator.",
      });
      return;
    }

    // Safety: Cannot delete the last Super Admin
    if (normalizeRole(targetAdmin.role) === ROLES.SUPER_ADMIN) {
      const remainingSuperAdminCount = await User.countDocuments({
        role: "super_admin",
        _id: { $ne: targetAdmin._id },
      });

      if (remainingSuperAdminCount === 0) {
        res.status(400).json({
          success: false,
          message: "Cannot delete the sole Super Administrator account.",
        });
        return;
      }
    }

    await User.findByIdAndDelete(id);

    auditLog("ADMIN_DELETED", "SUCCESS", req, {
      userId: requesterId,
      role: req.user?.role,
      details: {
        deletedUserId: id,
        deletedEmail: targetAdmin.email,
      },
    });

    res.status(200).json({
      success: true,
      message: "Administrator deleted successfully.",
    });
  } catch (error) {
    console.error("Delete administrator error:", error);
    next(error);
  }
};

// =====================================================
// 6. GET ROLES & PERMISSIONS MATRIX
// =====================================================

export const getRolesAndPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const rolesData = [
      {
        id: ROLES.SUPER_ADMIN,
        role: ROLES.SUPER_ADMIN,
        name: ROLE_LABELS[ROLES.SUPER_ADMIN],
        label: ROLE_LABELS[ROLES.SUPER_ADMIN],
        level: 3,
        description:
          "Highest level administrative role with unrestricted access across all organizational data, security settings, and system-level configurations.",
        permissionsCount: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN].length,
        permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
      },
      {
        id: ROLES.ADMINISTRATOR,
        role: ROLES.ADMINISTRATOR,
        name: ROLE_LABELS[ROLES.ADMINISTRATOR],
        label: ROLE_LABELS[ROLES.ADMINISTRATOR],
        level: 2,
        description:
          "Organizational management role with full operational control over employees, tasks, departments, reports, calendar, and exports.",
        permissionsCount: ROLE_PERMISSIONS[ROLES.ADMINISTRATOR].length,
        permissions: ROLE_PERMISSIONS[ROLES.ADMINISTRATOR],
      },
      {
        id: ROLES.EMPLOYEE,
        role: ROLES.EMPLOYEE,
        name: ROLE_LABELS[ROLES.EMPLOYEE],
        label: ROLE_LABELS[ROLES.EMPLOYEE],
        level: 1,
        description:
          "Standard employee access for personal workspace, managing self-assigned tasks, receiving notifications, and exporting personal data.",
        permissionsCount: ROLE_PERMISSIONS[ROLES.EMPLOYEE].length,
        permissions: ROLE_PERMISSIONS[ROLES.EMPLOYEE],
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        roles: rolesData,
        allPermissions: Array.from(new Set(Object.values(PERMISSIONS))),
      },
    });
  } catch (error) {
    console.error("Get roles and permissions error:", error);
    next(error);
  }
};

// =====================================================
// 7. GET AUDIT LOGS
// =====================================================

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const { eventType, status, search, startDate, endDate } = req.query;

    const filter: any = {};

    if (eventType && eventType !== "ALL") {
      const typeStr = String(eventType).trim();
      if (typeStr === "PASSWORD_RESET") {
        filter.eventType = { $in: ["PASSWORD_RESET", "PASSWORD_RESET_SUCCESS", "PASSWORD_RESET_FAILED"] };
      } else if (typeStr === "ACCOUNT_LOCKED") {
        filter.eventType = { $in: ["ACCOUNT_LOCKED", "AUTH_ACCOUNT_LOCKED"] };
      } else {
        filter.eventType = typeStr;
      }
    }

    if (status && status !== "ALL") {
      filter.status = String(status).trim();
    }

    if (search && typeof search === "string" && search.trim()) {
      const query = search.trim();
      filter.$or = [
        { userEmail: { $regex: query, $options: "i" } },
        { userName: { $regex: query, $options: "i" } },
        { eventType: { $regex: query, $options: "i" } },
        { ip: { $regex: query, $options: "i" } },
        { endpoint: { $regex: query, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      const dateFilter: any = {};

      if (startDate) {
        const startStr = String(startDate).trim();
        let startObj: Date;

        if (/^\d{4}-\d{2}-\d{2}$/.test(startStr)) {
          // Plain YYYY-MM-DD: beginning of that calendar day in India Standard Time (+05:30)
          const [y, m, d] = startStr.split("-").map(Number);
          startObj = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
        } else {
          startObj = new Date(startStr);
        }

        if (isNaN(startObj.getTime())) {
          res.status(400).json({
            success: false,
            message: "Invalid startDate format. Expected ISO 8601 or YYYY-MM-DD.",
          });
          return;
        }
        dateFilter.$gte = startObj;
      }

      if (endDate) {
        const endStr = String(endDate).trim();
        let endObj: Date;

        if (/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
          // Plain YYYY-MM-DD: beginning of the day after final selected day in IST for exclusive boundary
          const [y, m, d] = endStr.split("-").map(Number);
          endObj = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
        } else {
          endObj = new Date(endStr);
        }

        if (isNaN(endObj.getTime())) {
          res.status(400).json({
            success: false,
            message: "Invalid endDate format. Expected ISO 8601 or YYYY-MM-DD.",
          });
          return;
        }
        dateFilter.$lt = endObj;
      }

      if (dateFilter.$gte && dateFilter.$lt && dateFilter.$gte > dateFilter.$lt) {
        res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate",
        });
        return;
      }

      filter.createdAt = dateFilter;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    next(error);
  }
};
