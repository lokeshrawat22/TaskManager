// =====================================================
// TASK TYPES
// =====================================================

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED";

export type TaskPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

// =====================================================
// USER
// =====================================================

export interface TaskUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePhoto?: string;
}

// =====================================================
// TASK
// =====================================================

export interface Task {
  _id: string;

  title: string;
  description: string;

  createdBy: TaskUser | string;
  assignedTo: TaskUser | string;

  status: TaskStatus;
  priority: TaskPriority;

  dueDate: string;
  completedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

// =====================================================
// API RESPONSE
// =====================================================

export interface TaskResponse {
  success: boolean;
  message?: string;

  data: {
    task: Task;
  };
}

// =====================================================
// TASK LIST RESPONSE
// =====================================================

export interface TaskListResponse {
  success: boolean;

  data: {
    tasks: Task[];
  };

  pagination: {
    currentPage: number;
    perPage: number;
    totalTasks: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// =====================================================
// CREATE TASK
// =====================================================

export interface CreateTaskPayload {
  title: string;
  description: string;
  assignedTo: string;
  priority?: TaskPriority;
  dueDate: string;
}

// =====================================================
// UPDATE TASK
// =====================================================

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

// =====================================================
// UPDATE STATUS
// =====================================================

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
}