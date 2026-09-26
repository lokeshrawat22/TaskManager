// =====================================================
// DASHBOARD SERVICE
// =====================================================

import { apiRequest } from "./api.service";

// =====================================================
// EMPLOYEE DASHBOARD
// =====================================================

export const getEmployeeDashboard = async (options: RequestInit = {}) => {
  return apiRequest("/api/dashboard/employee", {
    method: "GET",
    ...options,
  });
};

// =====================================================
// ADMIN DASHBOARD
// =====================================================

export const getAdminDashboard = async (
  period?: string,
  options: RequestInit = {}
) => {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return apiRequest(`/api/dashboard/admin${query}`, {
    method: "GET",
    ...options,
  });
};

// =====================================================
// EMPLOYEE PERFORMANCE (PAGINATED)
// =====================================================

export const getEmployeePerformance = async (
  page: number = 1,
  limit: number = 6,
  search?: string,
  department?: string,
  role?: string,
  period?: string,
  options: RequestInit = {}
) => {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  if (search && search.trim()) params.set("search", search.trim());
  if (department && department !== "ALL" && department !== "all") {
    params.set("department", department);
  }
  if (role && role !== "ALL" && role !== "all") {
    params.set("role", role);
  }
  if (period && period !== "ALL_TIME" && period !== "all_time" && period !== "all-time") {
    params.set("period", period.toLowerCase().replace(/-/g, "_"));
  } else {
    params.set("period", "all_time");
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiRequest(`/api/dashboard/admin/employee-performance${query}`, {
    method: "GET",
    ...options,
  });
};