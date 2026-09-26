import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import Task from "../models/task.model.js";
import Department from "../models/department.model.js";
import Designation from "../models/designation.model.js";
import { auditLog } from "../utils/auditLogger.js";
import {
  DEPARTMENT_DESIGNATION_MAP,
  DEPARTMENTS,
} from "../constants/employee.constants.js";
import { ROLES, normalizeRole } from "../constants/rbac.constants.js";
import {
  getEmployeeRoleFilter,
  getEmployeeStats,
} from "../services/employee.service.js";

// =====================================================
// GET ALL EMPLOYEES
// ADMIN ONLY
// =====================================================

export const getEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const employeeFilter = getEmployeeRoleFilter();

    const [employees, stats] = await Promise.all([
      User.find(employeeFilter)
        .select(
          "_id firstName lastName email phone profilePhoto employeeId role department designation isBlocked",
        )
        .sort({
          firstName: 1,
        })
        .lean(),
      getEmployeeStats(),
    ]);

    res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      data: {
        employees,
        ...stats,
      },
    });
  } catch (error) {
    console.error("Get employees error:", error);

    next(error);
  }
};

// =====================================================
// ASSIGN / UPDATE EMPLOYEE DEPARTMENT
// ADMIN ONLY
// =====================================================

export const updateEmployeeDepartment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { department } = req.body;

    // =================================================
    // VALIDATE MONGODB ID
    // =================================================

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Employee database ID is required",
      });

      return;
    }

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Invalid employee database ID",
      });

      return;
    }

    // =================================================
    // VALIDATE DEPARTMENT
    // =================================================

    if (typeof department !== "string" || !department.trim()) {
      res.status(400).json({
        success: false,
        message: "Department is required",
      });

      return;
    }

    const normalizedDepartment = department.trim();

    // Check DB Department master data first, fallback to static DEPARTMENTS for backward compatibility
    const deptDoc = await Department.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(normalizedDepartment)
          ? [{ _id: normalizedDepartment }]
          : []),
        {
          name: {
            $regex: new RegExp(
              `^${normalizedDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
              "i",
            ),
          },
        },
      ],
    });

    if (!deptDoc && !DEPARTMENTS.includes(normalizedDepartment)) {
      res.status(400).json({
        success: false,
        message: "Invalid department selected.",
      });

      return;
    }

    // =================================================
    // FIND EMPLOYEE
    // =================================================

    const employee = await User.findById(id);

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });

      return;
    }

    const requesterRole = normalizeRole(req.user?.role);
    if (
      normalizeRole(employee.role) === ROLES.SUPER_ADMIN &&
      requesterRole !== ROLES.SUPER_ADMIN
    ) {
      res.status(403).json({
        success: false,
        message:
          "You are not authorized to modify a Super Administrator account.",
      });

      return;
    }

    // =================================================
    // UPDATE DEPARTMENT
    // =================================================

    employee.department = deptDoc ? deptDoc.name : normalizedDepartment;
    if (deptDoc) {
      employee.departmentId = deptDoc._id as any;
    }

    await employee.save();

    // =================================================
    // RESPONSE
    // =================================================

    res.status(200).json({
      success: true,
      message: "Employee department updated successfully",
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.designation,
          role: employee.role,
        },
      },
    });
  } catch (error) {
    console.error("Update employee department error:", error);

    next(error);
  }
};

// =====================================================
// GET EMPLOYEE BY MONGODB DATABASE ID
// ADMIN ONLY
// =====================================================
//
// URL example:
//
// GET /api/users/employees/6a8d3386c49dae57303fa8c8
//
// Here `id` is MongoDB `_id`.
//
// It is NOT the company employeeId such as MM001.
// =====================================================

export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Employee database ID is required",
      });

      return;
    }

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Invalid employee database ID",
      });

      return;
    }

    const employee = await User.findById(id)
      .select(
        "_id firstName lastName email country countryCode phone dateOfBirth gender qualification employeeId department designation role isBlocked isEmailVerified isPhoneVerified profilePhoto createdAt updatedAt",
      )
      .lean();

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });

      return;
    }

    res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      data: {
        employee,
      },
    });
  } catch (error) {
    console.error("Get employee by MongoDB ID error:", error);

    next(error);
  }
};

// =====================================================
// CHECK EMPLOYEE ID AVAILABILITY
// ADMIN ONLY
// GET /api/users/check-employee-id?employeeId=MM001&excludeId=...
// =====================================================

export const checkEmployeeIdAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { employeeId, excludeId } = req.query;

    if (!employeeId || typeof employeeId !== "string") {
      res.status(400).json({
        success: false,
        message: "Employee ID query parameter is required",
      });
      return;
    }

    const normalizedEmployeeId = employeeId.trim().toUpperCase();

    if (!/^MM\d{3,}$/i.test(normalizedEmployeeId)) {
      res.status(400).json({
        success: false,
        message: "Employee ID must be like MM001",
      });
      return;
    }

    const query: any = {
      employeeId: { $regex: new RegExp(`^${normalizedEmployeeId}$`, "i") },
    };

    if (excludeId && mongoose.Types.ObjectId.isValid(String(excludeId))) {
      query._id = { $ne: new mongoose.Types.ObjectId(String(excludeId)) };
    }

    const existing = await User.findOne(query).select("_id employeeId").lean();

    if (existing) {
      res.status(200).json({
        success: true,
        available: false,
        message: "This Employee ID is already assigned.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      available: true,
      message: "Employee ID is available",
    });
  } catch (error) {
    console.error("Check employee ID availability error:", error);
    next(error);
  }
};

// =====================================================
// UPDATE EMPLOYEE DETAILS
// EMPLOYEE ID / DEPARTMENT / DESIGNATION
// ADMIN ONLY
// =====================================================
//
// URL:
//
// PATCH /api/users/:id
//
// `id` = MongoDB _id
//
// Body:
//
// {
//   "employeeId": "MM001",
//   "department": "Engineering",
//   "designation": "Software Engineer"
// }
// =====================================================

export const updateEmployeeDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const { employeeId, department, designation, role } = req.body;

    // =================================================
    // 1. VALIDATE MONGODB ID
    // =================================================

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Employee database ID is required",
      });

      return;
    }

    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Invalid employee database ID",
      });

      return;
    }

    // =================================================
    // 2. FIND EMPLOYEE
    // =================================================

    const employee = await User.findById(id);

    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });

      return;
    }

    const requester = req.user;
    const requesterRole = normalizeRole(requester?.role);
    const targetCurrentRole = normalizeRole(employee.role);

    // If target is super_admin and requester is not super_admin:
    // Block any non-super_admin from modifying a Super Administrator account
    if (
      targetCurrentRole === ROLES.SUPER_ADMIN &&
      requesterRole !== ROLES.SUPER_ADMIN
    ) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requester?.userId,
        role: requester?.role,
        details: {
          reason:
            "Non-super_admin attempted to modify a Super Administrator account",
          targetId: employee._id,
        },
      });

      res.status(403).json({
        success: false,
        message:
          "You are not authorized to modify a Super Administrator account.",
      });

      return;
    }

    // =================================================
    // 3. ROLE UPDATE
    // =================================================

    let roleChanged = false;
    let oldRole = employee.role;

    if (role !== undefined) {
      const trimmedRole = String(role).trim();
      const validRoles = [
        "super_admin",
        "superadmin",
        "administrator",
        "admin",
        "employee",
        "user",
      ];

      if (!validRoles.includes(trimmedRole.toLowerCase())) {
        res.status(400).json({
          success: false,
          message: "Invalid role selected.",
        });

        return;
      }

      const targetNewRole = normalizeRole(trimmedRole);

      // Only evaluate if role is being changed
      if (targetNewRole !== targetCurrentRole) {
        // Only Super Administrator can change another user's role
        if (requesterRole !== ROLES.SUPER_ADMIN) {
          auditLog("SECURITY_EVENT", "DENIED", req, {
            userId: requester?.userId,
            role: requester?.role,
            details: {
              reason: "Unauthorized role change attempt",
              targetId: employee._id,
              targetRole: targetCurrentRole,
              requestedRole: targetNewRole,
            },
          });

          res.status(403).json({
            success: false,
            message: "You are not authorized to change this role.",
          });

          return;
        }

        // Safety: Prevent demoting the last active Super Administrator
        if (
          targetCurrentRole === ROLES.SUPER_ADMIN &&
          targetNewRole !== ROLES.SUPER_ADMIN
        ) {
          const activeSuperAdminCount = await User.countDocuments({
            role: { $in: ["super_admin", "superadmin"] },
            _id: { $ne: employee._id },
            isBlocked: { $ne: true },
          } as any);

          if (activeSuperAdminCount === 0) {
            res.status(400).json({
              success: false,
              message:
                "Cannot change the role of the last active Super Administrator. Please assign another Super Administrator first.",
            });

            return;
          }
        }

        employee.role = targetNewRole;
        roleChanged = true;
      }
    }

    // =================================================
    // 4. EMPLOYEE ID
    // =================================================

    if (employeeId !== undefined) {
      const normalizedEmployeeId = String(employeeId).trim().toUpperCase();

      if (!/^MM\d{3,}$/i.test(normalizedEmployeeId)) {
        res.status(400).json({
          success: false,
          message: "Employee ID must be like MM001",
        });

        return;
      }

      // =================================================
      // CHECK DUPLICATE EMPLOYEE ID (case-insensitive & trimmed)
      // =================================================

      const existingEmployee = await User.findOne({
        employeeId: { $regex: new RegExp(`^${normalizedEmployeeId}$`, "i") },
        _id: {
          $ne: employee._id,
        },
      });

      if (existingEmployee) {
        res.status(409).json({
          success: false,
          message: "This Employee ID is already assigned.",
        });

        return;
      }

      employee.employeeId = normalizedEmployeeId;
    }

    // =================================================
    // 5. DEPARTMENT
    // =================================================

    let isDeptChanged = false;
    let resolvedDeptDoc: any = null;

    if (department !== undefined) {
      if (typeof department !== "string" || !department.trim()) {
        res.status(400).json({
          success: false,
          message: "Department cannot be empty",
        });

        return;
      }

      const trimmedDepartment = department.trim();
      isDeptChanged =
        trimmedDepartment.toLowerCase() !==
        (employee.department || "").toLowerCase();

      // Check DB Department collection first, fallback to static DEPARTMENTS
      resolvedDeptDoc = await Department.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(trimmedDepartment)
            ? [{ _id: trimmedDepartment }]
            : []),
          {
            name: {
              $regex: new RegExp(
                `^${trimmedDepartment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i",
              ),
            },
          },
        ],
      });

      // Only perform validation if department is being changed or was not previously set
      if (isDeptChanged || !employee.department) {
        if (!resolvedDeptDoc && !DEPARTMENTS.includes(trimmedDepartment)) {
          res.status(400).json({
            success: false,
            message: "Invalid department selected.",
          });
          return;
        }

        employee.department = resolvedDeptDoc
          ? resolvedDeptDoc.name
          : trimmedDepartment;
        if (resolvedDeptDoc) {
          employee.departmentId = resolvedDeptDoc._id as any;
        }
      }
    }

    // =================================================
    // 6. DESIGNATION
    // =================================================

    if (designation !== undefined) {
      if (typeof designation !== "string" || !designation.trim()) {
        res.status(400).json({
          success: false,
          message: "Designation cannot be empty",
        });

        return;
      }

      const trimmedDesignation = designation.trim();
      const currentDept =
        department !== undefined
          ? department.trim()
          : employee.department || "";
      const isDesigChanged =
        trimmedDesignation.toLowerCase() !==
        (employee.designation || "").toLowerCase();

      // Only perform cross-validation if designation or department is modified, or if designation was not set
      if (isDesigChanged || isDeptChanged || !employee.designation) {
        // Resolve department doc if not already resolved
        if (!resolvedDeptDoc && currentDept) {
          resolvedDeptDoc = await Department.findOne({
            $or: [
              ...(mongoose.Types.ObjectId.isValid(currentDept)
                ? [{ _id: currentDept }]
                : []),
              {
                name: {
                  $regex: new RegExp(
                    `^${currentDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                    "i",
                  ),
                },
              },
            ],
          });
        }

        // Check DB Designation collection first, fallback to static map
        const desigDoc = await Designation.findOne({
          $or: [
            ...(mongoose.Types.ObjectId.isValid(trimmedDesignation)
              ? [{ _id: trimmedDesignation }]
              : []),
            {
              name: {
                $regex: new RegExp(
                  `^${trimmedDesignation.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                  "i",
                ),
              },
            },
          ],
        });

        const validDesignations = currentDept
          ? DEPARTMENT_DESIGNATION_MAP[currentDept] || []
          : [];
        const inStaticMap = validDesignations.some(
          (d) => d.toLowerCase() === trimmedDesignation.toLowerCase(),
        );

        let matchesDesigDocDept = false;
        if (desigDoc) {
          if (!desigDoc.department && !desigDoc.departmentName) {
            // Designation without department restriction
            matchesDesigDocDept = true;
          } else if (
            desigDoc.departmentName &&
            desigDoc.departmentName.toLowerCase() === currentDept.toLowerCase()
          ) {
            matchesDesigDocDept = true;
          } else if (
            resolvedDeptDoc &&
            desigDoc.department &&
            desigDoc.department.toString() === resolvedDeptDoc._id.toString()
          ) {
            matchesDesigDocDept = true;
          }
        }

        if (!inStaticMap && !matchesDesigDocDept) {
          res.status(400).json({
            success: false,
            message: "Invalid designation for the selected department.",
          });
          return;
        }

        employee.designation = desigDoc ? desigDoc.name : trimmedDesignation;
        if (desigDoc) {
          employee.designationId = desigDoc._id as any;
        }
      }
    }

    // =================================================
    // 7. SAVE CHANGES
    // =================================================

    await employee.save();

    // =================================================
    // 8. AUDIT LOG & NOTIFICATION
    // =================================================

    if (roleChanged) {
      auditLog("ROLE_CHANGED", "SUCCESS", req, {
        userId: requester?.userId,
        role: requester?.role,
        details: {
          targetUserId: employee._id.toString(),
          targetEmail: employee.email,
          oldRole,
          newRole: employee.role,
          changedBy: requester?.userId,
        },
      });

      try {
        await Notification.create({
          recipient: employee._id,
          recipientRole: employee.role,
          type: "EMPLOYEE_UPDATED",
          title: "Role Updated",
          message: `Your system role has been updated to ${employee.role === ROLES.SUPER_ADMIN ? "Super Administrator" : employee.role === ROLES.ADMINISTRATOR ? "Administrator" : "Employee"}.`,
        });
      } catch (notifErr) {
        console.error("Failed to create role change notification:", notifErr);
      }
    }

    // =================================================
    // 9. SUCCESS RESPONSE
    // =================================================

    res.status(200).json({
      success: true,
      message: roleChanged
        ? "Role updated successfully."
        : "Employee updated successfully",
      data: {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.designation,
          role: employee.role,
        },
      },
    });
  } catch (error: any) {
    // =================================================
    // DUPLICATE EMPLOYEE ID
    // =================================================

    if (error?.code === 11000) {
      res.status(409).json({
        success: false,
        message: "This Employee ID is already assigned.",
      });

      return;
    }

    console.error("Update employee details error:", error);

    next(error);
  }
};

// =====================================================
// UPDATE EMPLOYEE ROLE (ROLE ONLY)
// SUPER ADMIN ONLY
// PATCH /api/users/:id/role
// PATCH /api/users/employees/:id/role
// Body: { role: string }
// =====================================================
export const updateEmployeeRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const requester = req.user;

    // 1. Authenticate Requester
    if (!requester || !requester.userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const requesterRole = normalizeRole(requester.role);

    // 2. Authorize Requester: Only Super Administrator can change roles
    if (requesterRole !== ROLES.SUPER_ADMIN) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: requester.userId,
        role: requester.role,
        details: {
          reason:
            "Unauthorized role change attempt: Only Super Administrator can change roles",
          targetId: id,
        },
      });

      res.status(403).json({
        success: false,
        message: "You are not authorized to change this role.",
      });
      return;
    }

    // 3. Validate Target ID Format
    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).json({
        success: false,
        message: "Invalid employee ID format",
      });
      return;
    }

    // 4. Validate Target Exists
    const employee = await User.findById(id);
    if (!employee) {
      res.status(404).json({
        success: false,
        message: "Employee not found",
      });
      return;
    }

    // 5. Prevent Self-Role Change
    if (employee._id.toString() === requester.userId.toString()) {
      res.status(400).json({
        success: false,
        message: "You cannot change your own role.",
      });
      return;
    }

    // 6. Validate Role Input
    if (!role || typeof role !== "string" || !role.trim()) {
      res.status(400).json({
        success: false,
        message: "Role is required.",
      });
      return;
    }

    const trimmedRole = role.trim();
    const validRoles = [
      "super_admin",
      "superadmin",
      "super_administrator",
      "superadministrator",
      "administrator",
      "admin",
      "employee",
      "user",
    ];

    if (!validRoles.includes(trimmedRole.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: "Invalid role selected.",
      });
      return;
    }

    const targetNewRole = normalizeRole(trimmedRole);
    const targetCurrentRole = normalizeRole(employee.role);
    const oldRole = employee.role;

    // Safety: Prevent demoting the last active Super Administrator
    if (
      targetCurrentRole === ROLES.SUPER_ADMIN &&
      targetNewRole !== ROLES.SUPER_ADMIN
    ) {
      const activeSuperAdminCount = await User.countDocuments({
        role: { $in: ["super_admin", "superadmin"] },
        _id: { $ne: employee._id },
        isBlocked: { $ne: true },
      } as any);

      if (activeSuperAdminCount === 0) {
        res.status(400).json({
          success: false,
          message:
            "Cannot change the role of the last active Super Administrator. Please assign another Super Administrator first.",
        });
        return;
      }
    }

    // 7. Targeted Database Update (ONLY role is updated; department & designation untouched!)
    const updatedEmployee = await User.findByIdAndUpdate(
      employee._id,
      { $set: { role: targetNewRole } },
      { new: true },
    )
      .select(
        "_id firstName lastName email country countryCode phone dateOfBirth gender qualification employeeId department departmentId designation designationId role isBlocked isEmailVerified isPhoneVerified profilePhoto createdAt updatedAt",
      )
      .lean();

    if (!updatedEmployee) {
      res.status(500).json({
        success: false,
        message: "Failed to update employee role.",
      });
      return;
    }

    // 8. Audit Log & Notification (if role actually changed)
    if (targetNewRole !== targetCurrentRole) {
      auditLog("ROLE_CHANGED", "SUCCESS", req, {
        userId: requester.userId,
        role: requester.role,
        details: {
          actor: "Super Administrator",
          target:
            `${updatedEmployee.firstName || ""} ${updatedEmployee.lastName || ""}`.trim() ||
            updatedEmployee.email,
          targetUserId: updatedEmployee._id.toString(),
          targetEmail: updatedEmployee.email,
          oldRole,
          newRole: targetNewRole,
          timestamp: new Date().toISOString(),
          changedBy: requester.userId,
        },
      });

      try {
        await Notification.create({
          recipient: updatedEmployee._id,
          recipientRole: targetNewRole,
          type: "EMPLOYEE_UPDATED",
          title: "Role Updated",
          message: `Your system role has been updated to ${
            targetNewRole === ROLES.SUPER_ADMIN
              ? "Super Administrator"
              : targetNewRole === ROLES.ADMINISTRATOR
                ? "Administrator"
                : "Employee"
          }.`,
        });
      } catch (notifErr) {
        console.error("Failed to create role change notification:", notifErr);
      }
    }

    // 9. Response
    res.status(200).json({
      success: true,
      message: "Account role updated successfully.",
      data: {
        employee: updatedEmployee,
      },
    });
  } catch (error: any) {
    console.error("Update employee role error:", error);
    next(error);
  }
};

export const toggleEmployeeBlock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const actor = req.user;

    if (!actor || !actor.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const actorId = actor.userId;
    const actorRole = normalizeRole(actor.role);

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid user ID is required.",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 1. Self-blocking is NOT allowed
    // actor = SUPER_ADMIN, target = actor -> DENY
    if (targetUser._id.toString() === actorId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot block or unblock your own account.",
      });
    }

    const targetRole = normalizeRole(targetUser.role);

    // 2. Super Administrator accounts can NEVER be blocked
    // actor = SUPER_ADMIN, target = SUPER_ADMIN -> DENY
    // actor = ADMIN, target = SUPER_ADMIN -> DENY
    if (targetRole === ROLES.SUPER_ADMIN) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: actorId,
        role: actor.role,
        details: {
          reason: "Attempted to block a Super Administrator account",
          targetUserId: targetUser._id.toString(),
        },
      });
      return res.status(403).json({
        success: false,
        message: "Super Administrator accounts cannot be blocked.",
      });
    }

    // 3. Administrator accounts:
    // actor = SUPER_ADMIN, target = ADMIN -> ALLOW
    // actor = ADMIN, target = ADMIN -> DENY
    if (targetRole === ROLES.ADMINISTRATOR) {
      if (actorRole !== ROLES.SUPER_ADMIN) {
        auditLog("SECURITY_EVENT", "DENIED", req, {
          userId: actorId,
          role: actor.role,
          details: {
            reason:
              "Administrator attempted to block another Administrator account",
            targetUserId: targetUser._id.toString(),
          },
        });
        return res.status(403).json({
          success: false,
          message:
            "Only Super Administrators have permission to block Administrator accounts.",
        });
      }
    } else if (targetRole === ROLES.EMPLOYEE) {
      // actor = SUPER_ADMIN, target = EMPLOYEE -> ALLOW
      // actor = ADMIN, target = EMPLOYEE -> ALLOW
      if (
        actorRole !== ROLES.SUPER_ADMIN &&
        actorRole !== ROLES.ADMINISTRATOR
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to block employee accounts.",
        });
      }
    }

    // 4. Modify ONLY target user (never the actor)
    targetUser.isBlocked = !targetUser.isBlocked;

    await targetUser.save();

    // 5. Audit Log (actor: Super Admin A, target: Admin B)
    const isTargetAdmin = targetRole === ROLES.ADMINISTRATOR;
    const eventType = isTargetAdmin
      ? targetUser.isBlocked
        ? "ADMIN_BLOCKED"
        : "ADMIN_UNBLOCKED"
      : targetUser.isBlocked
        ? "EMPLOYEE_BLOCKED"
        : "EMPLOYEE_UNBLOCKED";

    auditLog(eventType, "SUCCESS", req, {
      userId: actorId,
      role: actor.role,
      details: {
        targetUserId: targetUser._id.toString(),
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        action: targetUser.isBlocked ? "BLOCKED" : "UNBLOCKED",
        newStatus: targetUser.isBlocked ? "Blocked" : "Active",
      },
    });

    // 6. Notification to target user
    try {
      await Notification.create({
        recipient: targetUser._id,
        type: targetUser.isBlocked ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED",
        title: targetUser.isBlocked
          ? isTargetAdmin
            ? "Administrator Account Blocked"
            : "Account Blocked"
          : isTargetAdmin
            ? "Administrator Account Unblocked"
            : "Account Unblocked",
        message: targetUser.isBlocked
          ? `Your ${isTargetAdmin ? "administrator " : ""}account has been blocked by the ${actorRole === ROLES.SUPER_ADMIN ? "Super Administrator" : "administrator"}.`
          : `Your ${isTargetAdmin ? "administrator " : ""}account has been unblocked by the ${actorRole === ROLES.SUPER_ADMIN ? "Super Administrator" : "administrator"}.`,
      });
    } catch (notifErr) {
      console.error("Failed to create block/unblock notification:", notifErr);
    }

    const userTypeLabel = isTargetAdmin ? "Administrator" : "Employee";
    const actionLabel = targetUser.isBlocked ? "blocked" : "unblocked";

    return res.status(200).json({
      success: true,
      message: `${userTypeLabel} ${actionLabel} successfully`,
      data: {
        id: targetUser._id,
        _id: targetUser._id,
        employeeId: targetUser.employeeId,
        role: targetUser.role,
        isBlocked: targetUser.isBlocked,
        status: targetUser.isBlocked ? "BLOCKED" : "ACTIVE",
        employee: {
          id: targetUser._id,
          _id: targetUser._id,
          employeeId: targetUser.employeeId,
          role: targetUser.role,
          isBlocked: targetUser.isBlocked,
          status: targetUser.isBlocked ? "BLOCKED" : "ACTIVE",
        },
      },
    });
  } catch (error) {
    console.error("Toggle employee block error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee block status",
    });
  }
};

// =====================================================
// EXPORT MY DATA (DPDP Act 2023 - Section 11 Right to Access)
// EMPLOYEE / USER SELF-SERVICE
// =====================================================

export const exportMyData = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const user = await User.findById(userId)
      .select("-password -otp -otpExpiry -resetPasswordSessionId")
      .lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const tasks = await Task.find({ assignedTo: userId })
      .select("title description status priority dueDate createdAt updatedAt")
      .lean();

    const notifications = await Notification.find({ recipient: userId })
      .select("type title message isRead createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    auditLog("DATA_EXPORTED", "SUCCESS", req, {
      userId,
      role: (req as any).user?.role,
      details: {
        taskCount: tasks.length,
        notificationCount: notifications.length,
      },
    });

    const exportPayload = {
      generatedAt: new Date().toISOString(),
      statutoryNotice:
        "Personal data export provided pursuant to the Digital Personal Data Protection Act, 2023 (Section 11 - Right to Access).",
      profile: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        country: user.country,
        countryCode: user.countryCode,
        role: user.role,
        department: user.department,
        designation: user.designation,
        employeeId: user.employeeId,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        qualification: user.qualification,
        consent: user.consent,
        accountCreatedAt: user.createdAt,
      },
      assignedTasks: tasks,
      notifications,
    };

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="mindmatrix_data_${user._id}.json"`,
    );
    res.setHeader("Content-Type", "application/json");
    res.status(200).json(exportPayload);
  } catch (error) {
    console.error("Export personal data error:", error);
    next(error);
  }
};
