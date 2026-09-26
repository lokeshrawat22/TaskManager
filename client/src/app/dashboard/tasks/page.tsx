"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { downloadExportFile, ExportFormat } from "@/service/export.service";
import { showToast } from "@/lib/toast";
import { useLanguage } from "@/context/LanguageContext";
import {
  StatMiniBarChart,
  StatusBadge,
  PriorityBadge,
  Pagination,
  LoadingState,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

// =====================================================
// HELPERS
// =====================================================

function normalizeStatus(status?: string) {
  const value = String(status || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (value === "COMPLETED") return "COMPLETED";
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function normalizePriority(priority?: string) {
  return priority?.toUpperCase() || "LOW";
}

function formatDate(date?: string, language: string = "en") {
  if (!date) return language === "hi" ? "कोई देय तिथि नहीं" : "No due date";

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return language === "hi" ? "अमान्य तिथि" : "Invalid date";
  }

  return parsedDate.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task: Task) {
  if (!task.dueDate || normalizeStatus(task.status) === "COMPLETED") {
    return false;
  }

  const dueTime = new Date(task.dueDate).getTime();
  if (Number.isNaN(dueTime)) return false;

  return dueTime < Date.now();
}

// =====================================================
// TASKS CONTENT COMPONENT (WRAPPED IN SUSPENSE)
// =====================================================

function TasksContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");

  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Export state & dropdown
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false);
    if (isExporting) return;
    setIsExporting(true);

    try {
      const params: Record<string, string> = {
        scope: "tasks",
        format,
      };

      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (priorityFilter && priorityFilter !== "ALL") params.priority = priorityFilter;
      if (dateFilter && dateFilter !== "ALL") params.dateFilter = dateFilter;
      if (search && search.trim()) params.search = search.trim();

      await downloadExportFile(params);
      showToast.success(`Tasks exported successfully as ${format.toUpperCase()}`);
    } catch (err: any) {
      console.error("[EMPLOYEE TASKS] Export error:", err);
      showToast.error(err?.message || "Failed to export tasks. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Sync with URL search params
  useEffect(() => {
    const taskId = searchParams.get("taskId");
    if (taskId) {
      router.push(`/dashboard/tasks/${taskId}`);
      return;
    }

    const dateParam = String(
      searchParams.get("date") || searchParams.get("filter") || ""
    )
      .trim()
      .toUpperCase();

    if (dateParam === "UPCOMING") {
      setDateFilter("UPCOMING");
      setStatusFilter("ALL");
      return;
    }

    const status = String(
      searchParams.get("status") || searchParams.get("status_text") || ""
    )
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    if (!status) return;

    if (status === "OVERDUE") {
      setStatusFilter("ALL");
      setDateFilter("OVERDUE");
      return;
    }

    if (status === "UPCOMING") {
      setStatusFilter("ALL");
      setDateFilter("UPCOMING");
      return;
    }

    if (status === "TODO" || status === "PENDING") {
      setStatusFilter("PENDING");
      setDateFilter("ALL");
      return;
    }

    if (status === "IN_PROGRESS" || status === "COMPLETED") {
      setStatusFilter(status);
      setDateFilter("ALL");
    }
  }, [searchParams, router]);

  const fetchTasks = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const response = await apiRequest<any>("/api/tasks/my?limit=100", {
        method: "GET",
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load your tasks");
      }

      const fetchedTasks = response?.data?.tasks || [];
      const taskMap = new Map<string, Task>();
      fetchedTasks.forEach((task: Task) => {
        if (task?._id) {
          taskMap.set(String(task._id), task);
        }
      });

      setTasks(Array.from(taskMap.values()));
    } catch (err: any) {
      console.error("[EMPLOYEE TASKS] Fetch error:", err);
      setTasks([]);
      setError(err?.message || "Unable to load your tasks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Filter logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const query = search.trim().toLowerCase();
      const searchableText = `${task.title || ""} ${task.description || ""} ${
        task.priority || ""
      } ${task.status || ""}`.toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OVERDUE"
          ? isOverdue(task)
          : normalizeStatus(task.status) === statusFilter);

      const matchesPriority =
        priorityFilter === "ALL" ||
        normalizePriority(task.priority) === priorityFilter;

      let matchesDate = true;
      if (dateFilter === "OVERDUE") {
        matchesDate = isOverdue(task);
      } else if (dateFilter === "UPCOMING") {
        if (!task.dueDate) {
          matchesDate = false;
        } else {
          const dueTime = new Date(task.dueDate).getTime();
          matchesDate = !Number.isNaN(dueTime) && dueTime > Date.now();
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });
  }, [tasks, search, statusFilter, priorityFilter, dateFilter]);

  // Counts
  const totalCount = tasks.length;
  const pendingCount = tasks.filter(
    (task) => normalizeStatus(task.status) === "PENDING"
  ).length;
  const progressCount = tasks.filter(
    (task) => normalizeStatus(task.status) === "IN_PROGRESS"
  ).length;
  const completedCount = tasks.filter(
    (task) => normalizeStatus(task.status) === "COMPLETED"
  ).length;
  const overdueCount = tasks.filter((task) => isOverdue(task)).length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = filteredTasks.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter, dateFilter]);

  const hasFilters = Boolean(
    search ||
      statusFilter !== "ALL" ||
      priorityFilter !== "ALL" ||
      dateFilter !== "ALL"
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setDateFilter("ALL");
  };

  const handleCardFilter = (type: "total" | "pending" | "progress" | "completed" | "overdue") => {
    if (type === "total") {
      clearFilters();
    } else if (type === "overdue") {
      setStatusFilter("ALL");
      setDateFilter("OVERDUE");
    } else if (type === "progress") {
      setStatusFilter("IN_PROGRESS");
      setDateFilter("ALL");
    } else if (type === "pending") {
      setStatusFilter("PENDING");
      setDateFilter("ALL");
    } else if (type === "completed") {
      setStatusFilter("COMPLETED");
      setDateFilter("ALL");
    }
  };

  if (loading) {
    return <LoadingState message="Loading your task assignments..." rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          1. PAGE HEADER (MATCHES ADMIN TASKS HEADER)
      ================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
              {t("taskManagement") || "TASK MANAGEMENT"}
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {t("tasks_text") || "Tasks"}
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B] dark:text-[#94A3B8]">
            {t("tasksSubtitle") || "Manage, track and complete every task assigned to you across your organization."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Export Dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              disabled={isExporting}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] transition cursor-pointer disabled:opacity-60"
              title="Export your assigned tasks"
            >
              {isExporting ? (
                <RefreshCw size={14} className="animate-spin text-[#0284C7] dark:text-[#38BDF8]" />
              ) : (
                <Download size={14} className="text-[#0284C7] dark:text-[#38BDF8]" />
              )}
              <span>{isExporting ? "Exporting..." : "Export"}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-[#CBD5E1] bg-white py-1.5 shadow-xl dark:border-[#1E3A47] dark:bg-[#0B202B]">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Export Format
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("xlsx")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#F1F5F9] dark:text-slate-200 dark:hover:bg-[#102A36] transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">XLS</span>
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#F1F5F9] dark:text-slate-200 dark:hover:bg-[#102A36] transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">CSV</span>
                  <span>CSV Spreadsheet (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#F1F5F9] dark:text-slate-200 dark:hover:bg-[#102A36] transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-400">PDF</span>
                  <span>PDF Document (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("json")}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#F1F5F9] dark:text-slate-200 dark:hover:bg-[#102A36] transition"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">JSON</span>
                  <span>Raw JSON (.json)</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            title={t("common.refresh") || "Refresh tasks"}
            className="inline-flex h-[38px] items-center gap-2 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] transition cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-[#2563EB]" : "text-[#64748B] dark:text-[#94A3B8]"}
            />
            <span>{refreshing ? "Refreshing..." : (t("common.refresh") || "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* =================================================
          2. KPI METRIC CARDS (EXACT ADMIN TASKS 5-CARD GRID)
      ================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        {/* CARD 1: TOTAL TASKS */}
        <button
          type="button"
          onClick={() => handleCardFilter("total")}
          className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
            statusFilter === "ALL" && dateFilter === "ALL" && !search && priorityFilter === "ALL"
              ? "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]/30 dark:border-[#38BDF8] dark:bg-[#0C3345]"
              : "border-[#CBD5E1] bg-white hover:border-[#2563EB] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A5F] dark:text-[#60A5FA]">
                <ClipboardList size={13} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("tasks.totalTasks") || "TOTAL TASKS"}
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[28px] font-bold text-[#0F172A] dark:text-white leading-[34px] tracking-[-0.02em] tabular-nums">
                {totalCount}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                <span>{language === "hi" ? "असाइन किया गया" : "Assigned work"}</span>
              </div>
            </div>
            <StatMiniBarChart color="#3B82F6" bars={[35, 55, 40, 70, 60, 85, 100]} />
          </div>
        </button>

        {/* CARD 2: PENDING */}
        <button
          type="button"
          onClick={() => handleCardFilter("pending")}
          className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
            statusFilter === "PENDING"
              ? "border-amber-400 bg-[#FFFDF5] ring-1 ring-amber-400/30 dark:border-amber-600 dark:bg-amber-950/30"
              : "border-[#CBD5E1] bg-white hover:border-amber-400 hover:bg-[#FFFDF7] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#FFFBEB] text-[#D97706] dark:bg-[#451A03] dark:text-[#FBBF24]">
                <Clock3 size={13} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("status.pending") || "PENDING"}
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[28px] font-bold text-[#D97706] dark:text-[#FBBF24] leading-[34px] tracking-[-0.02em] tabular-nums">
                {pendingCount}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#D97706] dark:text-[#FBBF24]">
                <span>{language === "hi" ? "शुरू नहीं हुआ" : "Not started"}</span>
              </div>
            </div>
            <StatMiniBarChart color="#F59E0B" bars={[25, 45, 35, 60, 50, 75, 65]} />
          </div>
        </button>

        {/* CARD 3: IN PROGRESS */}
        <button
          type="button"
          onClick={() => handleCardFilter("progress")}
          className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
            statusFilter === "IN_PROGRESS"
              ? "border-sky-400 bg-[#F0F9FF] ring-1 ring-sky-400/30 dark:border-sky-600 dark:bg-sky-950/30"
              : "border-[#CBD5E1] bg-white hover:border-sky-400 hover:bg-[#F0F9FF] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#F0F9FF] text-[#0284C7] dark:bg-[#0C384F] dark:text-[#38BDF8]">
                <Clock3 size={13} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("status.in_progress") || "IN PROGRESS"}
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[28px] font-bold text-[#0284C7] dark:text-[#38BDF8] leading-[34px] tracking-[-0.02em] tabular-nums">
                {progressCount}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#0284C7] dark:text-[#38BDF8]">
                <span>{language === "hi" ? "सक्रिय कार्य" : "Active work"}</span>
              </div>
            </div>
            <StatMiniBarChart color="#0EA5E9" bars={[30, 50, 45, 65, 60, 80, 75]} />
          </div>
        </button>

        {/* CARD 4: COMPLETED */}
        <button
          type="button"
          onClick={() => handleCardFilter("completed")}
          className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
            statusFilter === "COMPLETED"
              ? "border-emerald-400 bg-[#F3FCF8] ring-1 ring-emerald-400/30 dark:border-emerald-600 dark:bg-emerald-950/30"
              : "border-[#CBD5E1] bg-white hover:border-emerald-400 hover:bg-[#F8FDFB] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#ECFDF5] text-[#00A878] dark:bg-[#064E3B] dark:text-[#34D399]">
                <CheckCircle2 size={13} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("status.completed") || "COMPLETED"}
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[28px] font-bold text-[#00A878] dark:text-[#34D399] leading-[34px] tracking-[-0.02em] tabular-nums">
                {completedCount}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#00A878] dark:text-[#34D399]">
                <span>{language === "hi" ? "पूर्ण" : "Done"}</span>
              </div>
            </div>
            <StatMiniBarChart color="#00A878" bars={[38, 58, 52, 75, 68, 92, 88]} />
          </div>
        </button>

        {/* CARD 5: OVERDUE */}
        <button
          type="button"
          onClick={() => handleCardFilter("overdue")}
          className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
            dateFilter === "OVERDUE"
              ? "border-rose-400 bg-[#FFF5F5] ring-1 ring-rose-400/30 dark:border-rose-600 dark:bg-rose-950/30"
              : "border-[#CBD5E1] bg-white hover:border-rose-400 hover:bg-[#FFF8F8] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#FEF2F2] text-[#E5484D] dark:bg-rose-950/60 dark:text-rose-300">
                <AlertTriangle size={13} strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("dashboard.overdue") || "OVERDUE"}
              </span>
            </div>
            <ArrowUpRight
              size={14}
              className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[28px] font-bold text-[#E5484D] dark:text-rose-400 leading-[34px] tracking-[-0.02em] tabular-nums">
                {overdueCount}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#E5484D] dark:text-rose-400">
                <span>{language === "hi" ? "कार्रवाई आवश्यक" : "Action required"}</span>
              </div>
            </div>
            <StatMiniBarChart color="#EF5350" bars={[20, 35, 18, 45, 25, 30, 42]} />
          </div>
        </button>
      </div>

      {/* =================================================
          3. TASKS SECTION & DATA TABLE CARD
      ================================================= */}
      <div className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#2A4858] dark:bg-[#102A38] overflow-hidden">
        {/* FILTER / SEARCH TOOLBAR */}
        <div className="p-3.5 sm:p-4 border-b border-[#CBD5E1] dark:border-[#2A4858]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* LEFT: CONTROLS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* FILTERS BADGE */}
              <div className="inline-flex h-[38px] items-center gap-2 rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[13px] font-medium leading-[18px] text-[#475569] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#CBD5E1]">
                <Filter size={14} className="text-[#087D8F] dark:text-[#4CD2DA]" />
                <span>{t("common.filters") || "Filters"}</span>
              </div>

              {/* STATUS FILTER */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                    statusFilter !== "ALL"
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                  }`}
                >
                  <option value="ALL">{t("tasks.allStatus") || (language === "hi" ? "सभी स्थितियां" : "All Status")}</option>
                  <option value="PENDING">{t("status.pending") || "Pending"}</option>
                  <option value="IN_PROGRESS">{t("status.in_progress") || "In Progress"}</option>
                  <option value="COMPLETED">{t("status.completed") || "Completed"}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                />
              </div>

              {/* PRIORITY FILTER */}
              <div className="relative">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                    priorityFilter !== "ALL"
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                  }`}
                >
                  <option value="ALL">{t("tasks.allPriority") || (language === "hi" ? "सभी प्राथमिकताएं" : "All Priority")}</option>
                  <option value="URGENT">{t("priority.urgent") || "Urgent"}</option>
                  <option value="HIGH">{t("priority.high") || "High"}</option>
                  <option value="MEDIUM">{t("priority.medium") || "Medium"}</option>
                  <option value="LOW">{t("priority.low") || "Low"}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                />
              </div>

              {/* TIMELINE FILTER */}
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                    dateFilter !== "ALL"
                      ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                  }`}
                >
                  <option value="ALL">{language === "hi" ? "सभी तिथियां" : "All Dates"}</option>
                  <option value="UPCOMING">{language === "hi" ? "आगामी" : "Upcoming"}</option>
                  <option value="OVERDUE">{language === "hi" ? "अतिदेय" : "Overdue"}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                />
              </div>

              {/* RESET ACTIVE FILTERS */}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-1 inline-flex items-center gap-1 text-[12px] font-semibold text-[#DC2626] hover:underline transition cursor-pointer"
                >
                  <X size={12} strokeWidth={2.2} />
                  <span>{t("common.clear") || (language === "hi" ? "साफ़ करें" : "Clear")}</span>
                </button>
              )}
            </div>

            {/* RIGHT: SEARCH & VIEW MODE */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-full lg:w-[280px]">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("tasks.searchPlaceholder") || (language === "hi" ? "कार्य खोजें..." : "Search tasks...")}
                  className="h-[38px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#FBFDFE] pl-9 pr-8 text-[13px] font-normal leading-[20px] text-[#0F172A] placeholder-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white dark:placeholder-[#94A3B8]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* VIEW MODE TOGGLE */}
              <div className="hidden sm:flex items-center rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 dark:border-[#2A4858] dark:bg-[#0D2430]">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Table View"
                  className={`flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors ${
                    viewMode === "table"
                      ? "bg-white text-[#2563EB] shadow-xs dark:bg-[#102A36] dark:text-[#38BDF8]"
                      : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
                  }`}
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid View"
                  className={`flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors ${
                    viewMode === "grid"
                      ? "bg-white text-[#2563EB] shadow-xs dark:bg-[#102A36] dark:text-[#38BDF8]"
                      : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            TABLE VIEW
        ================================================= */}
        {viewMode === "table" ? (
          <div className="w-full overflow-x-auto responsive-table-scroll">
            <table className="enterprise-table w-full min-w-[780px] text-left border-collapse border border-[#CBD5E1] dark:border-[#1E3A47]">
              <thead className="border-b border-[#CBD5E1] bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#102A36]">
                <tr className="h-[40px] text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1] border-b border-[#CBD5E1] dark:border-[#1E3A47]">
                  <th className="px-5 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47] text-left">
                    {t("tasks.task") || (language === "hi" ? "कार्य" : "TASK")}
                  </th>
                  <th className="px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47] text-left whitespace-nowrap">
                    {t("tasks.priority") || (language === "hi" ? "प्राथमिकता" : "PRIORITY")}
                  </th>
                  <th className="px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47] text-left whitespace-nowrap">
                    {t("tasks.dueDate") || (language === "hi" ? "नियत तिथि" : "DUE DATE")}
                  </th>
                  <th className="px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47] text-left whitespace-nowrap">
                    {t("tasks.status") || (language === "hi" ? "स्थिति" : "STATUS")}
                  </th>
                  <th className="px-5 py-2.5 font-semibold text-right border-b border-[#CBD5E1] dark:border-[#1E3A47] whitespace-nowrap">
                    {t("common.actions") || (language === "hi" ? "कार्रवाई" : "ACTIONS")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
                {paginatedTasks.length === 0 ? (
                  <tr className="bg-white dark:bg-[#0B202B]">
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                        <ClipboardList size={22} />
                      </div>
                      <p className="mt-3 text-[14px] font-semibold text-[#0F172A] dark:text-[#E5F1F5]">
                        {t("tasks.noTasksFound") || (language === "hi" ? "कोई कार्य नहीं मिला" : "No tasks found")}
                      </p>
                      <p className="mt-1 text-[12px] font-normal text-[#64748B] dark:text-[#8FA8B2]">
                        {hasFilters
                          ? (language === "hi" ? "फ़िल्टर या खोज बदल कर देखें।" : "Try adjusting your filters or search keywords.")
                          : (language === "hi" ? "आपके लिए कोई कार्य असाइन नहीं है।" : "You currently have no tasks assigned to your workspace.")}
                      </p>
                      {hasFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white transition cursor-pointer"
                        >
                          {t("common.clearFilters") || "Clear Filters"}
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task, index) => {
                    const overdue = isOverdue(task);

                    return (
                      <tr
                        key={task._id || index}
                        onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                        className="group h-[58px] cursor-pointer bg-white border-b border-[#E5E7EB] transition-colors duration-150 hover:bg-[#F8FAFC] dark:bg-[#0B202B] dark:border-[#18333F] dark:hover:bg-[#102A36]"
                      >
                        {/* 1. TASK CELL */}
                        <td className="px-5 py-2.5 min-w-[220px]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA] border border-[#CBD5E1] dark:border-[#2A4858]">
                              <ClipboardList size={16} strokeWidth={2.2} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold leading-[20px] text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                                {task.title}
                              </p>
                              <p className="truncate text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                                {task.description || (language === "hi" ? "कोई विवरण उपलब्ध नहीं" : "No description provided")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. PRIORITY */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        {/* 3. DUE DATE */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 ${
                              overdue
                                ? "border-rose-300 bg-[#FFF1F2] text-[#DC2626] dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                                : "border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] dark:border-[#2A4858] dark:bg-[#123C46]/50 dark:text-[#E2E8F0]"
                            }`}
                          >
                            <CalendarDays
                              size={13}
                              className={`shrink-0 ${overdue ? "text-[#DC2626]" : "text-[#64748B] dark:text-[#8FA8B2]"}`}
                            />
                            <span className="whitespace-nowrap">{formatDate(task.dueDate, language)}</span>
                          </span>
                        </td>

                        {/* 4. STATUS */}
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <StatusBadge status={task.status} />
                        </td>

                        {/* 5. ACTIONS */}
                        <td
                          className="px-5 py-2.5 text-right cursor-default whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end">
                            <Link
                              href={`/dashboard/tasks/${task._id}`}
                              title={t("common.view") || "View Details"}
                              aria-label={t("common.view") || "View Details"}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] hover:border-[#2563EB] hover:text-[#2563EB] hover:bg-[#EFF6FF] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8] transition-colors"
                            >
                              <Eye size={15} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* =================================================
              GRID VIEW
          ================================================= */
          <div className="p-4 sm:p-5">
            {paginatedTasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <ClipboardList size={22} />
                </div>
                <p className="mt-3 text-[14px] font-semibold text-[#0F172A] dark:text-[#E5F1F5]">
                  {t("tasks.noTasksFound") || "No tasks found"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedTasks.map((task) => {
                  const overdue = isOverdue(task);

                  return (
                    <div
                      key={task._id}
                      onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                      className="group flex flex-col justify-between rounded-[12px] border border-[#CBD5E1] bg-white p-4 shadow-xs hover:border-[#2563EB] hover:shadow-sm transition-all duration-150 cursor-pointer dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8]"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <PriorityBadge priority={task.priority} />
                          <StatusBadge status={task.status} />
                        </div>

                        <h3 className="text-[14px] font-bold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="mt-1 text-[12px] text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-3 text-xs dark:border-[#18333F]">
                        <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8]">
                          <CalendarDays size={13} className={overdue ? "text-[#DC2626]" : "text-[#2563EB]"} />
                          <span className={overdue ? "font-bold text-[#DC2626]" : ""}>
                            {formatDate(task.dueDate, language)}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                          <span>{t("common.view") || "View"}</span>
                          <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredTasks.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}

// Wrapper with Suspense for Next.js useSearchParams
export default function TasksPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading tasks..." rows={5} />}>
      <TasksContent />
    </Suspense>
  );
}