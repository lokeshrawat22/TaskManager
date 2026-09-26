import { API_BASE_URL } from "@/constants/api.constants";
import type {
  CreateTaskPayload,
  TaskListResponse,
  TaskResponse,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from "./task.types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

// =====================================================
// CREATE TASK - ADMIN
// =====================================================

export const createTask = async (
  payload: CreateTaskPayload
): Promise<TaskResponse> => {
  const response = await fetch(
    `${API_URL}/api/tasks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to create task"
    );
  }

  return data;
};

// =====================================================
// GET ALL TASKS - ADMIN
// =====================================================

export const getAllTasks =
  async (): Promise<TaskListResponse> => {
    const response = await fetch(
      `${API_URL}/api/tasks`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "Failed to fetch tasks"
      );
    }

    return data;
  };

// =====================================================
// GET MY TASKS - EMPLOYEE
// =====================================================

export const getMyTasks =
  async (): Promise<TaskListResponse> => {
    const response = await fetch(
      `${API_URL}/api/tasks/my`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Failed to fetch your tasks"
      );
    }

    return data;
  };

// =====================================================
// GET TASK BY ID
// =====================================================

export const getTaskById = async (
  taskId: string
): Promise<TaskResponse> => {
  const response = await fetch(
    `${API_URL}/api/tasks/${taskId}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to fetch task"
    );
  }

  return data;
};

// =====================================================
// UPDATE TASK STATUS
// =====================================================

export const updateTaskStatus = async (
  taskId: string,
  payload: UpdateTaskStatusPayload
): Promise<TaskResponse> => {
  const response = await fetch(
    `${API_URL}/api/tasks/${taskId}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Failed to update task status"
    );
  }

  return data;
};

// =====================================================
// UPDATE TASK - ADMIN
// =====================================================

export const updateTask = async (
  taskId: string,
  payload: UpdateTaskPayload
): Promise<TaskResponse> => {
  const response = await fetch(
    `${API_URL}/api/tasks/${taskId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to update task"
    );
  }

  return data;
};

// =====================================================
// DELETE TASK - ADMIN
// =====================================================

export const deleteTask = async (
  taskId: string
) => {
  const response = await fetch(
    `${API_URL}/api/tasks/${taskId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to delete task"
    );
  }

  return data;
};