// =====================================================
// EXPORT SERVICE
// =====================================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ExportOptions {
  scope: "employees" | "tasks" | "all";
  format: "csv" | "xlsx" | "json" | "pdf";
  filterMode?: "filtered" | "all";
  // Filter queries if any
  filters?: {
    status?: string;
    department?: string;
    role?: string;
    priority?: string;
    assignee?: string;
    search?: string;
    ids?: string[];
  };
}

/**
 * Triggers a browser download from a Blob
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * Download export file from server
 */
export async function downloadExportFile(
  scope: "employees" | "tasks" | "all",
  format: "csv" | "xlsx" | "json" | "pdf",
  filterParams: Record<string, any> = {}
): Promise<void> {
  const params = new URLSearchParams();
  params.set("scope", scope);
  params.set("format", format);

  Object.entries(filterParams).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
      if (Array.isArray(val)) {
        if (val.length > 0) params.set(key, val.join(","));
      } else {
        params.set(key, String(val));
      }
    }
  });

  const url = `${API_URL}/api/export?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    let errMsg = "Unable to export data. Please try again.";
    try {
      const errJson = await response.json();
      if (errJson?.message) errMsg = errJson.message;
    } catch {
      // not json
    }
    throw new Error(errMsg);
  }

  // Extract filename from Content-Disposition header if present
  let filename = "";
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  if (!filename) {
    const today = new Date().toISOString().split("T")[0];
    filename = `${scope}_${today}.${format}`;
  }

  const blob = await response.blob();
  triggerDownload(blob, filename);
}

/**
 * Main export handler accommodating all user requirements
 */
export async function executeExport(options: ExportOptions): Promise<void> {
  const { scope, format, filterMode, filters = {} } = options;

  const queryParams: Record<string, any> = {};

  if (filterMode === "filtered") {
    if (filters.status) {
      if (scope === "employees") queryParams.status = filters.status;
      if (scope === "tasks") queryParams.taskStatus = filters.status;
    }
    if (filters.department) queryParams.department = filters.department;
    if (filters.role) queryParams.employeeRole = filters.role;
    if (filters.priority) queryParams.taskPriority = filters.priority;
    if (filters.assignee) queryParams.assignee = filters.assignee;
    if (filters.ids && filters.ids.length > 0) {
      if (scope === "employees") queryParams.ids = filters.ids;
      if (scope === "tasks") queryParams.taskIds = filters.ids;
    }
  }

  // If scope === "all" and format === "csv": Download both employees.csv and tasks.csv
  if (scope === "all" && format === "csv") {
    await downloadExportFile("employees", "csv");
    // brief delay between triggering downloads so browsers don't block multiple tabs
    await new Promise((resolve) => setTimeout(resolve, 300));
    await downloadExportFile("tasks", "csv");
    return;
  }

  await downloadExportFile(scope, format, queryParams);
}
