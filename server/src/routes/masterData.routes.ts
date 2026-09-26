import { Router } from "express";
import {
  getDepartments,
  getDepartmentById,
  checkDepartmentName,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  getDesignationById,
  checkDesignationName,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} from "../controllers/masterData.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/role.middleware.js";
import { PERMISSIONS } from "../constants/rbac.constants.js";

const router = Router();

// Authentication required for all master-data operations
router.use(authenticate);

// =====================================================
// DEPARTMENTS ROUTES
// =====================================================

router.get(
  "/departments",
  requirePermission(PERMISSIONS.DEPARTMENTS_VIEW),
  getDepartments
);

router.get(
  "/departments/check-name",
  requirePermission(PERMISSIONS.DEPARTMENTS_VIEW),
  checkDepartmentName
);

router.get(
  "/departments/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_VIEW),
  getDepartmentById
);

router.post(
  "/departments",
  requirePermission(PERMISSIONS.DEPARTMENTS_MANAGE),
  createDepartment
);

router.patch(
  "/departments/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_MANAGE),
  updateDepartment
);

router.put(
  "/departments/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_MANAGE),
  updateDepartment
);

router.delete(
  "/departments/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_MANAGE),
  deleteDepartment
);

// =====================================================
// DESIGNATIONS ROUTES
// =====================================================

router.get(
  "/designations",
  requirePermission(PERMISSIONS.DESIGNATIONS_VIEW),
  getDesignations
);

router.get(
  "/designations/check-name",
  requirePermission(PERMISSIONS.DESIGNATIONS_VIEW),
  checkDesignationName
);

router.get(
  "/designations/:id",
  requirePermission(PERMISSIONS.DESIGNATIONS_VIEW),
  getDesignationById
);

router.post(
  "/designations",
  requirePermission(PERMISSIONS.DESIGNATIONS_MANAGE),
  createDesignation
);

router.patch(
  "/designations/:id",
  requirePermission(PERMISSIONS.DESIGNATIONS_MANAGE),
  updateDesignation
);

router.put(
  "/designations/:id",
  requirePermission(PERMISSIONS.DESIGNATIONS_MANAGE),
  updateDesignation
);

router.delete(
  "/designations/:id",
  requirePermission(PERMISSIONS.DESIGNATIONS_MANAGE),
  deleteDesignation
);

export default router;
