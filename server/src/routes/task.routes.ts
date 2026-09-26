import { Router } from "express";

import {
  createTask,
  getAllTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  updateTaskByAdmin,
} from "../controllers/task.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import { authorize } from "../middlewares/role.middleware.js";

const router = Router();

// =====================================================
// ALL TASK ROUTES REQUIRE LOGIN
// =====================================================

router.use(authenticate);

// =====================================================
// ADMIN
// =====================================================

// -----------------------------------------------------
// CREATE TASK
// POST /api/tasks
// -----------------------------------------------------

router.post(
  "/",
  authorize("admin"),
  createTask
);

// -----------------------------------------------------
// GET ALL TASKS
// GET /api/tasks
// -----------------------------------------------------

router.get(
  "/",
  authorize("admin"),
  getAllTasks
);

// =====================================================
// EMPLOYEE
// =====================================================

// -----------------------------------------------------
// GET MY TASKS
// GET /api/tasks/my
// -----------------------------------------------------

router.get(
  "/my",
  authorize("employee"),
  getMyTasks
);

// =====================================================
// ADMIN + EMPLOYEE
// =====================================================

// -----------------------------------------------------
// GET TASK BY ID
// GET /api/tasks/:taskId
// -----------------------------------------------------

router.get(
  "/:taskId",
  authorize("admin", "employee"),
  getTaskById
);

// -----------------------------------------------------
// UPDATE TASK STATUS
// PATCH /api/tasks/:taskId/status
// -----------------------------------------------------

router.patch(
  "/:taskId/status",
  authorize("admin", "employee"),
  updateTaskStatus
);

// =====================================================
// ADMIN ONLY
// =====================================================

// -----------------------------------------------------
// UPDATE TASK
// PATCH /api/tasks/:taskId
// -----------------------------------------------------

router.patch(
  "/:taskId",
  authorize("admin"),
  updateTask
);

// -----------------------------------------------------
// DELETE TASK
// DELETE /api/tasks/:taskId
// -----------------------------------------------------

router.delete(
  "/:taskId",
  authorize("admin"),
  deleteTask
);

// -----------------------------------------------------
// ADMIN TASK UPDATE
// PUT /api/tasks/admin/:taskId
// -----------------------------------------------------
//
// NOTE:
// Previous route:
// /admin/tasks/:taskId
//
// was incorrect because this router is already mounted
// under /api/tasks.
//
// -----------------------------------------------------

router.put(
  "/admin/:taskId",
  authorize("admin"),
  updateTaskByAdmin
);

export default router;