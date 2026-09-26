// =====================================================
// EXPORT SERVICE
// =====================================================

import { API_BASE_URL } from "@/constants/api.constants";
import { refreshAccessToken } from "./auth.service";

export type ExportScope = "employees" | "tasks" | "reports" | "all";
export type ExportFormat = "csv" | "xlsx" | "json" | "pdf";

export interface ExportOptions {
  scope: ExportScope;
  format: ExportFormat;
  filterMode?: "filtered" | "all";
  // Filter queries if any
  filters?: {
    status?: string;
    department?: string;
    role?: string;
    priority?: string;
    assignee?: string;
    search?: string;
    dateFilter?: string;
    fromDate?: string;
    toDate?: string;
    ids?: string[];
  };
}

/**
 * Normalizes and extracts the effective API base URL without trailing slashes
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return API_BASE_URL.replace(/\/+$/, "");
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

export interface ExportCallParams {
  scope: ExportScope;
  format: ExportFormat;
  [key: string]: any;
}

/**
 * Download export file from server with automatic token refresh and safe URL construction.
 * Supports both:
 * 1. downloadExportFile(scope, format, filters)
 * 2. downloadExportFile({ scope, format, ...filters })
 */
export async function downloadExportFile(
  scopeOrParams: ExportScope | ExportCallParams | Record<string, any>,
  formatOrNothing?: ExportFormat,
  filterParams: Record<string, any> = {}
): Promise<void> {
  let scope: ExportScope;
  let format: ExportFormat;
  let combinedFilters: Record<string, any> = {};

  if (typeof scopeOrParams === "object" && scopeOrParams !== null) {
    const { scope: s, format: f, ...rest } = scopeOrParams as any;
    scope = (s as ExportScope) || "all";
    format = (f as ExportFormat) || "xlsx";
    combinedFilters = { ...rest, ...filterParams };
  } else {
    scope = scopeOrParams as ExportScope;
    format = formatOrNothing || "xlsx";
    combinedFilters = filterParams;
  }

  const params = new URLSearchParams();
  params.set("scope", scope);
  params.set("format", format);

  Object.entries(combinedFilters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "" && val !== "ALL") {
      if (Array.isArray(val)) {
        if (val.length > 0) params.set(key, val.join(","));
      } else {
        params.set(key, String(val));
      }
    }
  });

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/export?${params.toString()}`;

  let response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "*/*",
    },
  });

  // If 401 Unauthorized, attempt access token refresh and retry once
  if (response.status === 401) {
    try {
      console.log("[EXPORT] Access token expired or missing. Refreshing session...");
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "*/*",
          },
        });
      }
    } catch {
      // Continue to error handling below
    }
  }

  if (!response.ok) {
    let errMsg = "Unable to export data. Please try again.";

    if (response.status === 403) {
      errMsg = "You do not have permission to export this dataset.";
    } else if (response.status === 404) {
      errMsg = "No records found matching the specified export criteria.";
    } else {
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (errJson?.message) errMsg = errJson.message;
        } catch {
          if (text.includes("Cannot GET") || response.status === 502) {
            errMsg = "Export service is currently waking up or unavailable. Please try again.";
          }
        }
      } catch {
        // Fallback default error
      }
    }

    throw new Error(errMsg);
  }

  // Extract filename from Content-Disposition header if present
  let filename = "";
  const disposition = response.headers.get("Content-Disposition");
  if (disposition) {
    // Check for standard filename="..."
    const standardMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (standardMatch && standardMatch[1]) {
      filename = standardMatch[1].trim();
    } else {
      // Check for RFC 5987 filename*=UTF-8''...
      const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utfMatch && utfMatch[1]) {
        filename = decodeURIComponent(utfMatch[1].trim());
      }
    }
  }

  if (!filename) {
    const today = new Date().toISOString().split("T")[0];
    const prefix = scope === "reports" ? "performance_report" : scope;
    filename = `${prefix}_${today}.${format}`;
  }

  const blob = await response.blob();
  triggerDownload(blob, filename);
}

/**
 * Main export handler accommodating all user requirements and scopes
 */
export async function executeExport(options: ExportOptions): Promise<void> {
  const { scope, format, filterMode, filters = {} } = options;

  const queryParams: Record<string, any> = {};

  if (filterMode === "filtered") {
    if (filters.status) {
      if (scope === "employees") queryParams.status = filters.status;
      if (scope === "tasks" || scope === "reports") queryParams.taskStatus = filters.status;
    }
    if (filters.department) queryParams.department = filters.department;
    if (filters.role) queryParams.employeeRole = filters.role;
    if (filters.priority) queryParams.taskPriority = filters.priority;
    if (filters.assignee) queryParams.assignee = filters.assignee;
    if (filters.search) queryParams.search = filters.search;
    if (filters.dateFilter) queryParams.dateFilter = filters.dateFilter;
    if (filters.fromDate) queryParams.fromDate = filters.fromDate;
    if (filters.toDate) queryParams.toDate = filters.toDate;
    if (filters.ids && filters.ids.length > 0) {
      if (scope === "employees") queryParams.ids = filters.ids;
      if (scope === "tasks") queryParams.taskIds = filters.ids;
    }
  }

  // If scope === "all" and format === "csv": Download both employees.csv and tasks.csv
  if (scope === "all" && format === "csv") {
    await downloadExportFile("employees", "csv");
    await new Promise((resolve) => setTimeout(resolve, 350));
    await downloadExportFile("tasks", "csv");
    return;
  }

  await downloadExportFile(scope, format, queryParams);
}
