// =====================================================
// TASK STATUS
// =====================================================

export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

// =====================================================
// TASK PRIORITY
// =====================================================

export type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

// =====================================================
// CREATE TASK DTO
// =====================================================

export interface CreateTaskDTO {
  title: string;
  description: string;

  // Project to which task belongs
  project: string;

  // Team responsible for the task
  team: string;

  // Employee/User assigned to task (supports single ID or array of IDs)
  assignedTo: string | string[];

  priority?: TaskPriority;

  dueDate: string;
}

// =====================================================
// UPDATE TASK DTO
// =====================================================

export interface UpdateTaskDTO {
  title?: string;
  description?: string;

  // Allow changing project/team/employee
  project?: string;
  team?: string;
  assignedTo?: string;

  priority?: TaskPriority;

  dueDate?: string;

  // Admin edit task payload
  status?: TaskStatus;
}

// =====================================================
// UPDATE TASK STATUS DTO
// =====================================================

export interface UpdateTaskStatusDTO {
  status: TaskStatus;
}

// =====================================================
// TASK QUERY DTO
// =====================================================

export interface TaskQueryDTO {
  search?: string;

  status?: TaskStatus;

  priority?: TaskPriority;

  assignedTo?: string;

  project?: string;

  team?: string;

  page?: string;

  limit?: string;
}