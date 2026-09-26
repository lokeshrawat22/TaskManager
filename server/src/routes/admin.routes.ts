import { Router } from "express";
import {
  getAdministrators,
  createAdministrator,
  updateAdministrator,
  toggleAdministratorBlock,
  deleteAdministrator,
  getRolesAndPermissions,
  getAuditLogs,
} from "../controllers/admin.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/role.middleware.js";
import { PERMISSIONS } from "../constants/rbac.constants.js";

const router = Router();

// All admin/system routes require authentication
router.use(authenticate);

// =====================================================
// ADMINISTRATOR MANAGEMENT
// Protected: administrators.* permissions (Super Admin)
// =====================================================

router.get(
  "/administrators",
  requirePermission(PERMISSIONS.ADMINISTRATORS_VIEW),
  getAdministrators
);

router.post(
  "/administrators",
  requirePermission(PERMISSIONS.ADMINISTRATORS_CREATE),
  createAdministrator
);

router.patch(
  "/administrators/:id",
  requirePermission(PERMISSIONS.ADMINISTRATORS_EDIT),
  updateAdministrator
);

router.put(
  "/administrators/:id",
  requirePermission(PERMISSIONS.ADMINISTRATORS_EDIT),
  updateAdministrator
);

router.patch(
  "/administrators/:id/block",
  requirePermission(PERMISSIONS.ADMINISTRATORS_DEACTIVATE),
  toggleAdministratorBlock
);

router.delete(
  "/administrators/:id",
  requirePermission(PERMISSIONS.ADMINISTRATORS_DEACTIVATE),
  deleteAdministrator
);

// =====================================================
// ROLES & PERMISSIONS
// Protected: roles.view permission (Super Admin)
// =====================================================

router.get(
  ["/roles-permissions", "/roles-and-permissions"],
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getRolesAndPermissions
);

// =====================================================
// AUDIT LOGS
// Protected: audit_logs.view permission (Super Admin)
// =====================================================

router.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_LOGS_VIEW),
  getAuditLogs
);

export default router;
