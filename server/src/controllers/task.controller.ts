import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import Task from "../models/task.model.js";
import User from "../models/user.model.js";
import Notification, {
  NotificationType,
} from "../models/notification.model.js";
import { auditLog } from "../utils/auditLogger.js";

import {
  CreateTaskDTO,
  UpdateTaskDTO,
  UpdateTaskStatusDTO,
  TaskQueryDTO,
} from "../dtos/task.dtos.js";

// =====================================================
// NOTIFICATION HELPER
// =====================================================

const createNotification = async (opts: {
  recipient: mongoose.Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: mongoose.Types.ObjectId | string;
}): Promise<void> => {
  try {
    await Notification.create(opts);
  } catch (err) {
    // Never let a notification failure break the main operation
    console.error("createNotification error:", err);
  }
};

// =====================================================
// HELPERS
// =====================================================

const isValidId = (id: unknown): id is string =>
  typeof id === "string" && mongoose.Types.ObjectId.isValid(id);

const parseDate = (value: unknown): Date | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(String(value));

  return Number.isNaN(date.getTime()) ? undefined : date;
};

// =====================================================
// CREATE TASK
// =====================================================

export const createTask = async (
  req: Request<{}, {}, CreateTaskDTO>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;

    // -------------------------------------------------
    // TITLE
    // -------------------------------------------------

    if (!title?.trim()) {
      res.status(400).json({
        success: false,
        message: "Task title is required",
      });
      return;
    }

    if (title.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: "Task title must be at least 3 characters",
      });
      return;
    }

    // -------------------------------------------------
    // DESCRIPTION
    // -------------------------------------------------

    if (!description?.trim()) {
      res.status(400).json({
        success: false,
        message: "Task description is required",
      });
      return;
    }

    // -------------------------------------------------
    // ASSIGNED EMPLOYEE(S)
    // -------------------------------------------------

    // Normalize: accept single ID string or array of ID strings
    const rawIds = Array.isArray(assignedTo)
      ? assignedTo
      : typeof assignedTo === "string" && assignedTo
        ? [assignedTo]
        : [];

    // Deduplicate
    const assignedToIds = Array.from(new Set(rawIds.filter(Boolean)));

    if (assignedToIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one valid assigned employee is required",
      });
      return;
    }

    // Validate all IDs are valid ObjectIds
    const invalidId = assignedToIds.find((id) => !isValidId(id));
    if (invalidId) {
      res.status(400).json({
        success: false,
        message: `Invalid employee ID: ${invalidId}`,
      });
      return;
    }

    // Batch-fetch all assigned employees
    const employees = await User.find({
      _id: { $in: assignedToIds },
    }).select("_id firstName lastName email employeeId isActive isBlocked");

    // Check all IDs resolved to real users
    if (employees.length !== assignedToIds.length) {
      res.status(404).json({
        success: false,
        message: "One or more assigned employees were not found",
      });
      return;
    }

    // Validate each employee is active and not blocked
    for (const employee of employees) {
      if ("isActive" in employee && employee.isActive === false) {
        res.status(400).json({
          success: false,
          message:
            `Employee is inactive: ${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
        });
        return;
      }

      if (employee.isBlocked === true) {
        res.status(400).json({
          success: false,
          message:
            `Cannot assign task to a blocked employee: ${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
        });
        return;
      }
    }

    // -------------------------------------------------
    // DUE DATE
    // -------------------------------------------------

    if (!dueDate) {
      res.status(400).json({
        success: false,
        message: "Due date is required",
      });
      return;
    }

    const parsedDueDate = parseDate(dueDate);

    if (!parsedDueDate) {
      res.status(400).json({
        success: false,
        message: "Invalid due date",
      });
      return;
    }

    // -------------------------------------------------
    // PRIORITY
    // -------------------------------------------------

    const allowedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

    if (priority !== undefined && !allowedPriorities.includes(priority)) {
      res.status(400).json({
        success: false,
        message: "Invalid task priority",
      });
      return;
    }

    // -------------------------------------------------
    // CREATE ONE TASK PER ASSIGNED EMPLOYEE
    // -------------------------------------------------

    const createdByObjectId = req.user!.userId;

    const createdTasks = await Promise.all(
      assignedToIds.map((empId) =>
        Task.create({
          title: title.trim(),
          description: description.trim(),
          createdBy: createdByObjectId,
          assignedTo: new mongoose.Types.ObjectId(empId),
          priority: priority || "MEDIUM",
          dueDate: parsedDueDate,
          status: "PENDING",
        }),
      ),
    );

    // -------------------------------------------------
    // POPULATED RESPONSE — return first (or only) task
    // -------------------------------------------------

    const primaryTask = createdTasks[0];

    const populatedTask = await Task.findById(primaryTask._id)
      .populate(
        "assignedTo",
        "firstName lastName email employeeId department designation",
      )
      .populate("createdBy", "firstName lastName email");

    // -------------------------------------------------
    // NOTIFICATIONS — send to every assigned employee
    // -------------------------------------------------

    await Promise.all(
      createdTasks.map((task) =>
        createNotification({
          recipient: task.assignedTo,
          type: "TASK_ASSIGNED",
          title: "New Task Assigned",
          message: `You have been assigned a new task: "${task.title}"`,
          taskId: task._id as mongoose.Types.ObjectId,
        }),
      ),
    );

    res.status(201).json({
      success: true,
      message:
        assignedToIds.length === 1
          ? "Task created successfully"
          : `Task created and assigned to ${assignedToIds.length} employees`,
      data: {
        task: populatedTask,
        tasksCreated: createdTasks.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET ALL TASKS - ADMIN
// =====================================================

export const getAllTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      search,
      status,
      priority,
      assignedTo,
      page = "1",
      limit = "10",
    } = req.query as TaskQueryDTO;

    const filter: Record<string, any> = {};

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    if (typeof search === "string" && search.trim()) {
      filter.$or = [
        {
          title: {
            $regex: search.trim(),
            $options: "i",
          },
        },
        {
          description: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    // -------------------------------------------------
    // STATUS
    // -------------------------------------------------

    if (status !== undefined) {
      if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Invalid task status",
        });
        return;
      }

      filter.status = status;
    }

    // -------------------------------------------------
    // PRIORITY
    // -------------------------------------------------

    if (priority !== undefined) {
      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
        res.status(400).json({
          success: false,
          message: "Invalid task priority",
        });
        return;
      }

      filter.priority = priority;
    }

    // -------------------------------------------------
    // ASSIGNED EMPLOYEE
    // -------------------------------------------------

    if (assignedTo !== undefined) {
      if (!isValidId(assignedTo)) {
        res.status(400).json({
          success: false,
          message: "Invalid assigned employee ID",
        });
        return;
      }

      filter.assignedTo = assignedTo;
    }

    // -------------------------------------------------
    // PAGINATION
    // -------------------------------------------------

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (pageNumber - 1) * limitNumber;

    // -------------------------------------------------
    // QUERY
    // -------------------------------------------------

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate(
          "assignedTo",
          "firstName lastName email employeeId department designation",
        )
        .populate("createdBy", "firstName lastName email")
        .sort({
          dueDate: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Task.countDocuments(filter),
    ]);

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET MY TASKS
// =====================================================

export const getMyTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tasks = await Task.find({
      assignedTo: req.user!.userId,
    })
      .populate("createdBy", "firstName lastName email")
      .sort({
        dueDate: 1,
        createdAt: -1,
      });

    res.status(200).json({
      success: true,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// GET TASK BY ID
// =====================================================

export const getTaskById = async (
  req: Request<{ taskId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!isValidId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
      return;
    }

    const task = await Task.findById(taskId)
      .populate(
        "assignedTo",
        "firstName lastName email employeeId department designation",
      )
      .populate("createdBy", "firstName lastName email");

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const assignedToId = (task.assignedTo as any)?._id
      ? (task.assignedTo as any)._id.toString()
      : task.assignedTo?.toString();

    const isAdmin =
      user.role === "admin" ||
      user.role === "administrator" ||
      user.role === "super_admin";
    const isAssignedUser = assignedToId === user.userId;

    if (!isAdmin && !isAssignedUser) {
      auditLog("TASK_AUTHZ_DENIED", "DENIED", req, {
        userId: user.userId,
        role: user.role,
        details: {
          action: "getTaskById",
          taskId: (task._id as any)?.toString(),
          assignedTo: assignedToId,
        },
      });

      res.status(403).json({
        success: false,
        message: "You are not authorized to access this task",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE TASK - ADMIN
// =====================================================

export const updateTask = async (
  req: Request<{ taskId: string }, {}, UpdateTaskDTO>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!isValidId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const { title, description, assignedTo, priority, dueDate } = req.body;

    // -------------------------------------------------
    // TITLE
    // -------------------------------------------------

    if (title !== undefined) {
      if (title.trim().length < 3) {
        res.status(400).json({
          success: false,
          message: "Task title must be at least 3 characters",
        });
        return;
      }

      task.title = title.trim();
    }

    // -------------------------------------------------
    // DESCRIPTION
    // -------------------------------------------------

    if (description !== undefined) {
      if (!description.trim()) {
        res.status(400).json({
          success: false,
          message: "Task description cannot be empty",
        });
        return;
      }

      task.description = description.trim();
    }

    // -------------------------------------------------
    // ASSIGNED TO
    // -------------------------------------------------

    if (assignedTo !== undefined) {
      if (!isValidId(assignedTo)) {
        res.status(400).json({
          success: false,
          message: "Invalid assigned employee ID",
        });
        return;
      }

      const employee = await User.findById(assignedTo).select("_id isActive");

      if (!employee) {
        res.status(404).json({
          success: false,
          message: "Assigned employee not found",
        });
        return;
      }

      if ("isActive" in employee && employee.isActive === false) {
        res.status(400).json({
          success: false,
          message: "Assigned employee is inactive",
        });
        return;
      }

      task.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // -------------------------------------------------
    // PRIORITY
    // -------------------------------------------------

    if (priority !== undefined) {
      if (!["LOW", "MEDIUM", "HIGH", "URGENT"].includes(priority)) {
        res.status(400).json({
          success: false,
          message: "Invalid priority",
        });
        return;
      }

      task.priority = priority;
    }

    // -------------------------------------------------
    // DUE DATE
    // -------------------------------------------------

    if (dueDate !== undefined) {
      const parsedDueDate = parseDate(dueDate);

      if (!parsedDueDate) {
        res.status(400).json({
          success: false,
          message: "Invalid due date",
        });
        return;
      }

      task.dueDate = parsedDueDate;
    }

    // -------------------------------------------------
    // STATUS — ADMIN TASK EDIT ALWAYS ENFORCES PENDING
    // -------------------------------------------------

    task.status = "PENDING";
    task.completedAt = null;

    // -------------------------------------------------
    // SAVE
    // -------------------------------------------------

    await task.save();

    // -------------------------------------------------
    // POPULATED RESPONSE
    // -------------------------------------------------

    const updatedTask = await Task.findById(task._id)
      .populate(
        "assignedTo",
        "firstName lastName email employeeId department designation",
      )
      .populate("createdBy", "firstName lastName email");

    // -------------------------------------------------
    // NOTIFICATION — TASK UPDATED
    // -------------------------------------------------

    createNotification({
      recipient: task.assignedTo,
      type: "TASK_UPDATED",
      title: "Task Updated",
      message: `The task "${task.title}" has been updated by the admin.`,
      taskId: task._id as mongoose.Types.ObjectId,
    });

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// UPDATE TASK STATUS
// =====================================================

export const updateTaskStatus = async (
  req: Request<{ taskId: string }, {}, UpdateTaskStatusDTO>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!isValidId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
      return;
    }

    if (!["PENDING", "IN_PROGRESS", "COMPLETED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid task status",
      });
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const assignedToId = (task.assignedTo as any)?._id
      ? (task.assignedTo as any)._id.toString()
      : task.assignedTo?.toString();

    const isAdmin =
      user.role === "admin" ||
      user.role === "administrator" ||
      user.role === "super_admin";
    const isAssignedUser = assignedToId === user.userId;

    if (!isAdmin && !isAssignedUser) {
      auditLog("TASK_AUTHZ_DENIED", "DENIED", req, {
        userId: user.userId,
        role: user.role,
        details: {
          action: "updateTaskStatus",
          taskId: (task._id as any)?.toString(),
          assignedTo: assignedToId,
          attemptedStatus: status,
        },
      });

      res.status(403).json({
        success: false,
        message: "Forbidden: You do not have access to this task",
      });
      return;
    }

    auditLog("TASK_STATUS_UPDATED", "SUCCESS", req, {
      userId: user.userId,
      role: user.role,
      details: {
        taskId: (task._id as any)?.toString(),
        previousStatus: task.status,
        newStatus: status,
      },
    });

    task.status = status;

    if (status === "COMPLETED") {
      task.completedAt = new Date();
    } else {
      task.completedAt = null;
    }

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate("assignedTo", "firstName lastName email employeeId")
      .populate("createdBy", "firstName lastName email");

    // -------------------------------------------------
    // NOTIFICATION — STATUS CHANGE
    // -------------------------------------------------

    if (status === "COMPLETED") {
      // Notify the admin (createdBy) that the employee completed the task
      createNotification({
        recipient: task.createdBy,
        type: "TASK_COMPLETED",
        title: "Task Completed",
        message: `A task has been marked as completed: "${task.title}"`,
        taskId: task._id as mongoose.Types.ObjectId,
      });
    } else {
      // Notify the employee of the status change
      createNotification({
        recipient: task.assignedTo,
        type: "TASK_UPDATED",
        title: "Task Status Changed",
        message: `Your task "${task.title}" status has been changed to ${status.replace("_", " ")}.`,
        taskId: task._id as mongoose.Types.ObjectId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Task status updated successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// DELETE TASK
// =====================================================

export const deleteTask = async (
  req: Request<{ taskId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { taskId } = req.params;

    if (!isValidId(taskId)) {
      res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
      return;
    }

    const task = await Task.findById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    await Task.findByIdAndDelete(taskId);

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// =====================================================
// ADMIN UPDATE ALIAS
// =====================================================

export const updateTaskByAdmin = updateTask;
