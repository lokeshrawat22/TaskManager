import { Request, Response, NextFunction } from "express";
import {
  ROLES,
  Role,
  Permission,
  normalizeRole,
  hasPermission,
} from "../constants/rbac.constants.js";
import { auditLog } from "../utils/auditLogger.js";

// =====================================================
// AUTHORIZE BY ROLE (HIERARCHICAL)
// =====================================================

export const authorize = (...allowedRoles: (Role | string)[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userCanonicalRole = normalizeRole(req.user.role);

    // Super Admin has unrestricted access to all admin/employee management endpoints
    if (userCanonicalRole === ROLES.SUPER_ADMIN) {
      next();
      return;
    }

    // Normalize allowed roles
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));

    if (!normalizedAllowed.includes(userCanonicalRole)) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: req.user.userId,
        role: req.user.role,
        details: {
          reason: "Role authorization failed",
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
      });

      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
};

// =====================================================
// REQUIRE PERMISSION (GRANULAR RBAC)
// =====================================================

export const requirePermission = (...permissions: Permission[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const userRole = req.user.role;

    // Verify all specified permissions are satisfied
    const missingPermissions = permissions.filter(
      (perm) => !hasPermission(userRole, perm)
    );

    if (missingPermissions.length > 0) {
      auditLog("SECURITY_EVENT", "DENIED", req, {
        userId: req.user.userId,
        role: req.user.role,
        details: {
          reason: "Missing required permissions",
          missingPermissions,
          userRole,
        },
      });

      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
        code: "PERMISSION_DENIED",
      });
      return;
    }

    next();
  };
};