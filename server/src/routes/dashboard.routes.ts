import { Router } from "express";

import {
  getAdminDashboardStats,
  getEmployeeDashboardStats,
  employeePerformance,
} from "../controllers/dashboard.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/role.middleware.js";

const router = Router();

// =====================================================
// ADMIN DASHBOARD
// =====================================================

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  getAdminDashboardStats
);

// =====================================================
// ADMIN - EMPLOYEE PERFORMANCE
// =====================================================

router.get(
  "/admin/employee-performance",
  authenticate,
  authorize("admin"),
  employeePerformance
);

// =====================================================
// EMPLOYEE DASHBOARD
// =====================================================

router.get(
  "/employee",
  authenticate,
  authorize("employee"),
  getEmployeeDashboardStats
);


export default router;