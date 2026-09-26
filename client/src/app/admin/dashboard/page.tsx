"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

import { apiRequest } from "@/service/api.service";
import {
  getAdminDashboard,
  getEmployeePerformance,
} from "@/service/dashboard.service";
import {
  AdminDashboardData,
  DashboardOverview,
  EmployeePerformanceItem,
  PaginationData,
  RecentTaskItem,
  TaskDistribution,
} from "./types";

import { can, PERMISSIONS } from "@/constants/rbac";
import DashboardCalendar from "./components/DashboardCalendar";
import DashboardSkeleton from "./components/DashboardSkeleton";
import DashboardStats from "./components/DashboardStats";
import EmployeePerformance from "./components/EmployeePerformance";
import OrganizationPerformance from "./components/OrganizationPerformance";
import OverdueAlert from "./components/OverdueAlert";
import PerformanceTrend from "./components/PerformanceTrend";
import QuickActions from "./components/QuickActions";
import RecentActivity from "./components/RecentActivity";
import TaskAnalytics from "./components/TaskAnalytics";
import WelcomeBanner from "./components/WelcomeBanner";
import TeamPerformance from "./components/TeamPerformance";
import UpcomingTasks from "./components/UpcomingTasks";
import AdminNeedsAttention from "./components/AdminNeedsAttention";

// ===================================================
// ADMIN DASHBOARD MAIN PAGE
// ===================================================

export default function AdminDashboardPage() {
  const { t, language } = useLanguage();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null
  );
  const [employees, setEmployees] = useState<EmployeePerformanceItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
  });
  const [tasks, setTasks] = useState<RecentTaskItem[]>([]);

  const [period, setPeriod] = useState<string>("all_time");
  const [employeeFilters, setEmployeeFilters] = useState<{
    department: string;
    role: string;
    dateRange: string;
  }>({
    department: "ALL",
    role: "ALL",
    dateRange: "all-time",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [error, setError] = useState("");

  // ===================================================
  // FETCH INITIAL DATA
  // ===================================================

  const loadAllDashboardData = useCallback(
    async (
      selectedPeriod: string = period,
      isBackgroundRefresh: boolean = false,
      signal?: AbortSignal
    ) => {
      try {
        if (!isBackgroundRefresh) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError("");

        const [dashboardRes, employeeRes, taskRes] = await Promise.all([
          getAdminDashboard(selectedPeriod, { signal }),
          getEmployeePerformance(
            1,
            6,
            undefined,
            employeeFilters.department,
            employeeFilters.role,
            employeeFilters.dateRange,
            { signal }
          ),
          apiRequest<any>("/api/tasks?limit=100", { method: "GET", signal }),
        ]);

        if (signal?.aborted) return;

        const dashData =
          dashboardRes?.data?.data ?? dashboardRes?.data ?? dashboardRes;
        const empData =
          employeeRes?.data?.data ?? employeeRes?.data ?? employeeRes;
        const taskData = taskRes?.data?.tasks ?? taskRes?.data ?? taskRes;

        if (dashData) {
          setDashboardData(dashData);
        }

        if (empData) {
          const empList = Array.isArray(empData)
            ? empData
            : empData?.employees ?? empData?.employeePerformance ?? [];
          setEmployees(empList);

          if (empData?.pagination) {
            setPagination(empData.pagination);
          } else {
            setPagination({
              total: empList.length,
              page: 1,
              limit: 6,
              totalPages: Math.ceil(empList.length / 6) || 1,
            });
          }
        }

        if (taskData) {
          const tList = Array.isArray(taskData) ? taskData : [];
          setTasks(tList);
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || signal?.aborted) return;
        console.error("Failed to load admin dashboard data:", err);
        setError(err?.message || "Failed to load admin dashboard");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [period, employeeFilters]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadAllDashboardData(period, false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadAllDashboardData, period]);

  // Dedicated Employee Performance Data Loader
  const loadEmployeeData = useCallback(
    async (
      newPage: number = 1,
      currentFilters = employeeFilters,
      signal?: AbortSignal
    ) => {
      try {
        setEmployeeLoading(true);
        const res = await getEmployeePerformance(
          newPage,
          6,
          undefined,
          currentFilters.department,
          currentFilters.role,
          currentFilters.dateRange,
          { signal }
        );
        const empData = res?.data?.data ?? res?.data ?? res;

        if (empData) {
          const empList = Array.isArray(empData)
            ? empData
            : empData?.employees ?? empData?.employeePerformance ?? [];
          setEmployees(empList);

          if (empData?.pagination) {
            setPagination(empData.pagination);
          } else {
            setPagination({
              total: empList.length,
              page: newPage,
              limit: 6,
              totalPages: Math.ceil(empList.length / 6) || 1,
            });
          }
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || signal?.aborted) return;
        console.error("Error loading employee performance page:", err);
      } finally {
        if (!signal?.aborted) {
          setEmployeeLoading(false);
        }
      }
    },
    [employeeFilters]
  );

  // Filter change handler (resets to page 1)
  const handleEmployeeFilterChange = useCallback(
    (newFilters: { department: string; role: string; dateRange: string }) => {
      setEmployeeFilters(newFilters);
      loadEmployeeData(1, newFilters);
    },
    [loadEmployeeData]
  );

  // Quick refresh handler
  const handleRefresh = useCallback(() => {
    loadAllDashboardData(period, true);
    loadEmployeeData(pagination.page || 1, employeeFilters);
  }, [loadAllDashboardData, loadEmployeeData, period, pagination.page, employeeFilters]);

  // ===================================================
  // PERIOD CHANGE HANDLER
  // ===================================================

  const handlePeriodChange = useCallback(async (newPeriod: string) => {
    setPeriod(newPeriod);
    try {
      const res = await getAdminDashboard(newPeriod);
      const data = res?.data?.data ?? res?.data ?? res;
      if (data) {
        setDashboardData((prev) => ({
          ...prev,
          overview: data.overview,
          taskDistribution: data.taskDistribution,
          trends: data.trends,
        }));
      }
    } catch (err) {
      console.error("Error changing period:", err);
    }
  }, []);

  // ===================================================
  // EMPLOYEE PAGINATION HANDLER
  // ===================================================

  const handleEmployeePageChange = useCallback(
    (newPage: number) => {
      loadEmployeeData(newPage, employeeFilters);
    },
    [loadEmployeeData, employeeFilters]
  );

  // Safe Fallback Overviews Derived from Live Data
  const overview: DashboardOverview = useMemo(() => {
    if (dashboardData?.overview) {
      return {
        totalEmployees: Number(dashboardData.overview.totalEmployees ?? 0),
        activeEmployees: Number(dashboardData.overview.activeEmployees ?? 0),
        inactiveEmployees: Number(dashboardData.overview.inactiveEmployees ?? 0),
        totalTasks: Number(dashboardData.overview.totalTasks ?? 0),
        pendingTasks: Number(dashboardData.overview.pendingTasks ?? 0),
        inProgressTasks: Number(dashboardData.overview.inProgressTasks ?? 0),
        completedTasks: Number(dashboardData.overview.completedTasks ?? 0),
        overdueTasks: Number(dashboardData.overview.overdueTasks ?? 0),
        totalDepartments: Number(dashboardData.overview.totalDepartments ?? 7),
        completionRate: Number(dashboardData.overview.completionRate ?? 0),
      };
    }
    return {
      totalEmployees: 0,
      activeEmployees: 0,
      inactiveEmployees: 0,
      totalTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      totalDepartments: 7,
      completionRate: 0,
    };
  }, [dashboardData]);

  const taskDistribution: TaskDistribution = useMemo(() => {
    if (dashboardData?.taskDistribution) {
      return {
        PENDING: Number(dashboardData.taskDistribution.PENDING ?? 0),
        IN_PROGRESS: Number(dashboardData.taskDistribution.IN_PROGRESS ?? 0),
        COMPLETED: Number(dashboardData.taskDistribution.COMPLETED ?? 0),
      };
    }
    return {
      PENDING: overview.pendingTasks,
      IN_PROGRESS: overview.inProgressTasks,
      COMPLETED: overview.completedTasks,
    };
  }, [dashboardData, overview]);

  const firstName = useMemo(() => {
    return (
      dashboardData?.user?.firstName?.trim() ||
      dashboardData?.user?.name?.trim()?.split(" ")[0] ||
      "Administrator"
    );
  }, [dashboardData]);

  const userRole = useMemo(() => {
    return dashboardData?.user?.role;
  }, [dashboardData]);

  const isSuperAdmin = useMemo(() => {
    return can(userRole, PERMISSIONS.AUDIT_LOGS_VIEW);
  }, [userRole]);

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error && !dashboardData) {
    return (
      <div className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-[#F5F9FC] dark:bg-[#071926] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#D9E5EF] bg-white p-8 text-center shadow-lg dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#EF4444]">
            <AlertCircle size={24} />
          </div>
          <h2 className="mt-4 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {language === "hi" ? "डैशबोर्ड डेटा लोड करने में असमर्थ" : "Unable to load dashboard data"}
          </h2>
          <p className="mt-2 text-[13px] font-normal leading-[20px] text-[#64748B] dark:text-[#94A3B8]">
            {error}
          </p>
          <button
            type="button"
            onClick={() => loadAllDashboardData(period)}
            className="mt-6 rounded-xl bg-[#007F9E] px-5 py-2.5 text-[13px] font-semibold leading-[18px] text-white hover:bg-[#0B4164] transition-colors shadow-xs cursor-pointer"
          >
            {t("common.tryAgain") || (language === "hi" ? "पुनः प्रयास करें" : "Retry")}
          </button>
        </div>
      </div>
    );
  }

  // ===================================================
  // RENDER DYNAMIC DASHBOARD
  // ===================================================

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071926] px-4 sm:px-8 py-6 sm:py-7">
      <div className="space-y-6">

        {/* 1. EXECUTIVE WELCOME BANNER WITH DYNAMIC GREETING (NO EMOJIS, 108–114px) */}
        <WelcomeBanner
          firstName={firstName}
          activeEmployees={overview.activeEmployees}
          totalTasks={overview.totalTasks}
          overdueTasks={overview.overdueTasks}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        />

        {/* 2. 5-METRIC ENTERPRISE KPI CARDS */}
        <DashboardStats
          overview={overview}
          trends={dashboardData?.trends}
        />

        {/* 3 & 4. UPPER MAIN ANALYTICS SECTION (7 / 5 SPLIT) */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-[20px] lg:grid-cols-12">
          {/* 3. TASK WORKLOAD DISTRIBUTION (7 COLS) */}
          <TaskAnalytics
            taskDistribution={taskDistribution}
            totalTasks={overview.totalTasks}
            overdueTasks={overview.overdueTasks}
            period={period}
            onPeriodChange={handlePeriodChange}
          />

          {/* 4. ORGANIZATION PERFORMANCE (5 COLS) */}
          <OrganizationPerformance
            completionRate={overview.completionRate}
            totalTasks={overview.totalTasks}
            completedTasks={overview.completedTasks}
            overdueTasks={overview.overdueTasks}
            trend={dashboardData?.trends?.completed || dashboardData?.trends?.completionRate}
            period={period}
          />
        </section>

        {/* 5 & 6. WORKFORCE LEADERBOARD & WORKLOAD SCHEDULE CALENDAR */}
        <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-[20px] lg:grid-cols-12">
          {/* EMPLOYEE PERFORMANCE LEADERBOARD (7/8 COLS) */}
          <EmployeePerformance
            employees={employees}
            pagination={pagination}
            onPageChange={handleEmployeePageChange}
            loading={employeeLoading}
            filters={employeeFilters}
            onFilterChange={handleEmployeeFilterChange}
          />

          {/* WORKLOAD SCHEDULE CALENDAR (5/4 COLS) */}
          <DashboardCalendar tasks={tasks} />
        </section>

        {/* 8. TREND ANALYTICS: WORKFORCE ACTIVITY & DELIVERY TREND (12 COLS FULL WIDTH) */}
        <section className="grid grid-cols-1 lg:grid-cols-12">
          <PerformanceTrend tasks={tasks} />
        </section>

        {/* 9 & 10. OPERATIONAL BOTTOM SECTION */}
        {isSuperAdmin ? (
          /* SUPER ADMINISTRATOR: RECENT ACTIVITY (7 COLS) + QUICK ACTIONS (5 COLS) */
          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-[20px] lg:grid-cols-12">
            {/* RECENT ACTIVITY TIMELINE (7 COLS) */}
            <RecentActivity tasks={tasks} role={userRole} />

            {/* OPERATIONAL SHORTCUTS (5 COLS) */}
            <QuickActions />
          </section>
        ) : (
          /* NORMAL ADMINISTRATOR: TEAM PERFORMANCE (5 COLS) + UPCOMING & PRIORITY TASKS (7 COLS) */
          <section className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-[20px] lg:grid-cols-12">
            {/* A. TEAM PERFORMANCE (5 COLS) */}
            <TeamPerformance overview={overview} employees={employees} />

            {/* B. UPCOMING & PRIORITY TASKS (7 COLS) */}
            <UpcomingTasks tasks={tasks} />
          </section>
        )}

        {/* 11. OPERATIONAL ATTENTION ALERT BANNER (FULL WIDTH) */}
        {isSuperAdmin ? (
          <OverdueAlert overdueCount={overview.overdueTasks} />
        ) : (
          <AdminNeedsAttention
            overdueCount={overview.overdueTasks}
            tasks={tasks}
          />
        )}

        {/* 11. MINIMAL ENTERPRISE FOOTER */}
        <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4 pb-2 text-[12px] font-normal leading-[17px] text-[#64748B] dark:border-[#1E435E] dark:text-[#94A3B8]">
          <p>{language === "hi" ? "© 2026 माइंडमैट्रिक्स। व्यवस्थापक कार्यक्षेत्र।" : "© 2026 MindMatrix. Admin Workspace."}</p>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00A878]" />
            <span className="font-normal leading-[17px]">{language === "hi" ? "सुरक्षित प्रशासनिक वातावरण" : "Secure administrative environment"}</span>
          </div>
        </footer>

      </div>
    </main>
  );
}