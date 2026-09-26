import { Router } from "express";

import {
  getEmployees,
  updateEmployeeDepartment,
  getEmployeeById,
  updateEmployeeDetails,
  updateEmployeeRole,
  toggleEmployeeBlock,
  exportMyData,
  checkEmployeeIdAvailability,
} from "../controllers/user.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  uploadCoverImage,
  removeCoverImage,
} from "../controllers/auth.controllers.js";

const router = Router();

// =====================================================
// CHECK EMPLOYEE ID AVAILABILITY
// ADMIN ONLY
// GET /api/users/check-employee-id?employeeId=MM001&excludeId=...
// =====================================================

router.get(
  "/check-employee-id",
  authenticate,
  authorize("admin"),
  checkEmployeeIdAvailability,
);

// =====================================================
// EXPORT CURRENT USER PERSONAL DATA (DPDP ACT 2023)
// AUTHENTICATED USER (ADMIN OR EMPLOYEE)
// GET /api/users/me/export
// =====================================================

router.get(
  "/me/export",
  authenticate,
  exportMyData,
);

// =====================================================
// GET ALL EMPLOYEES
// ADMIN ONLY
// =====================================================

router.get(
  "/employees",
  authenticate,
  authorize("admin"),
  getEmployees,
);

// =====================================================
// GET EMPLOYEE BY MONGODB ID
// ADMIN ONLY
// Example:
// GET /api/users/employees/6a8d3386c49dae57303fa8c8
// =====================================================

router.get(
  "/employees/:id",
  authenticate,
  authorize("admin"),
  getEmployeeById,
);

// =====================================================
// UPDATE EMPLOYEE DEPARTMENT
// ADMIN ONLY
// =====================================================

router.patch(
  "/:id/department",
  authenticate,
  authorize("admin"),
  updateEmployeeDepartment,
);

// =====================================================
// COVER IMAGE (AUTHENTICATED USER - EMPLOYEE OR ADMIN)
// =====================================================

router.put(
  "/profile/cover",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.patch(
  "/profile/cover",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.delete(
  "/profile/cover",
  authenticate,
  removeCoverImage,
);

router.put(
  "/profile/cover-image",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.patch(
  "/profile/cover-image",
  authenticate,
  upload.single("coverImage"),
  uploadCoverImage,
);

router.delete(
  "/profile/cover-image",
  authenticate,
  removeCoverImage,
);

// =====================================================
// UPDATE EMPLOYEE DETAILS
// ADMIN ONLY
// Employee ID + Department + Designation
// Example:
// PATCH /api/users/6a8d3386c49dae57303fa8c8
// =====================================================

router.patch(
  "/:id",
  authenticate,
  authorize("admin"),
  updateEmployeeDetails,
);

// =====================================================
// UPDATE EMPLOYEE ROLE (ROLE ONLY)
// SUPER ADMIN ONLY
// =====================================================
router.patch(
  "/:id/role",
  authenticate,
  authorize("super_admin"),
  updateEmployeeRole,
);

router.patch(
  "/employees/:id/role",
  authenticate,
  authorize("super_admin"),
  updateEmployeeRole,
);

router.patch(
  "/employees/:id/block",
  authenticate,
  authorize("admin"),
  toggleEmployeeBlock
);

export default router;