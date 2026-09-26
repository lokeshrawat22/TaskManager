import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// REPORTS SERVICE
// =====================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

// =====================================================
// ADMIN REPORT OVERVIEW
// =====================================================

export const getAdminReportOverview =
  async () => {
    const response = await fetch(
      `${API_URL}/api/dashboard/admin`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Failed to fetch admin report overview"
      );
    }

    return data;
  };

// =====================================================
// EMPLOYEE PERFORMANCE
// =====================================================

export const getEmployeePerformance =
  async () => {
    const response = await fetch(
      `${API_URL}/api/dashboard/admin/employee-performance`,
      {
        method: "GET",

        credentials: "include",

        headers: {
          "Content-Type":
            "application/json",
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message ||
          "Failed to fetch employee performance"
      );
    }

    return data;
  };

// =====================================================
// COMPLETE ADMIN REPORT
// =====================================================

export const getAdminReports =
  async () => {
    try {
      const [
        overview,
        employeePerformance,
      ] = await Promise.all([
        getAdminReportOverview(),
        getEmployeePerformance(),
      ]);

      return {
        overview,
        employeePerformance,
      };
    } catch (error) {
      console.error(
        "Admin reports service error:",
        error
      );

      throw error;
    }
  };