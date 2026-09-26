"use client";

import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ChevronDown,
  Download,
  Flame,
  ListTodo,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Zap,
} from "lucide-react";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/service/api.service";
import { downloadExportFile, ExportFormat } from "@/service/export.service";
import { showToast } from "@/lib/toast";
import {
  StatCard,
  SectionCard,
  ProgressBar,
  LoadingState,
  ErrorState,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

// =====================================================
// HELPERS
// =====================================================

function normalizeStatus(status?: string): TaskStatus {
  const value = String(status || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (value === "COMPLETED") return "COMPLETED";
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function normalizePriority(priority?: string): TaskPriority {
  const value = String(priority || "")
    .trim()
    .toUpperCase();

  if (value === "URGENT") return "URGENT";
  if (value === "HIGH") return "HIGH";
  if (value === "MEDIUM") return "MEDIUM";
  return "LOW";
}

function isOverdue(task: Task) {
  if (!task.dueDate || normalizeStatus(task.status) === "COMPLETED") {
    return false;
  }
  const dueTime = new Date(task.dueDate).getTime();
  if (Number.isNaN(dueTime)) return false;
  return dueTime < Date.now();
}

function percentage(value: number, total: number) {
  if (total <= 0 || value <= 0) return 0;
  return Math.round((value / total) * 100);
}

// =====================================================
// MAIN REPORTS PAGE COMPONENT
// =====================================================

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
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
      await downloadExportFile({
        scope: "reports",
        format,
      });
      showToast.success(`Report exported successfully as ${format.toUpperCase()}`);
    } catch (err: any) {
      console.error("[REPORTS] Export error:", err);
      showToast.error(err?.message || "Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const loadReports = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await apiRequest<any>("/api/tasks/my?limit=200", {
        method: "GET",
      });

      const taskList: Task[] = response?.data?.tasks || response?.tasks || [];
      setTasks(taskList);
    } catch (err: any) {
      console.error("[REPORTS] Fetch error:", err);
      setError(err?.message || "Failed to load productivity report data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Metric aggregates
  const totalTasks = tasks.length;
  const completedTasks = useMemo(
    () => tasks.filter((t) => normalizeStatus(t.status) === "COMPLETED"),
    [tasks]
  );
  const inProgressTasks = useMemo(
    () => tasks.filter((t) => normalizeStatus(t.status) === "IN_PROGRESS"),
    [tasks]
  );
  const pendingTasks = useMemo(
    () => tasks.filter((t) => normalizeStatus(t.status) === "PENDING"),
    [tasks]
  );
  const overdueTasks = useMemo(
    () => tasks.filter((t) => isOverdue(t)),
    [tasks]
  );

  const completedCount = completedTasks.length;
  const inProgressCount = inProgressTasks.length;
  const pendingCount = pendingTasks.length;
  const overdueCount = overdueTasks.length;

  const completedPct = percentage(completedCount, totalTasks);
  const inProgressPct = percentage(inProgressCount, totalTasks);
  const pendingPct = percentage(pendingCount, totalTasks);
  const overduePct = percentage(overdueCount, totalTasks);

  // Priority distribution
  const priorityStats = useMemo(() => {
    const urgent = tasks.filter((t) => normalizePriority(t.priority) === "URGENT").length;
    const high = tasks.filter((t) => normalizePriority(t.priority) === "HIGH").length;
    const medium = tasks.filter((t) => normalizePriority(t.priority) === "MEDIUM").length;
    const low = tasks.filter((t) => normalizePriority(t.priority) === "LOW").length;

    return {
      urgent,
      high,
      medium,
      low,
      urgentPct: percentage(urgent, totalTasks),
      highPct: percentage(high, totalTasks),
      mediumPct: percentage(medium, totalTasks),
      lowPct: percentage(low, totalTasks),
    };
  }, [tasks, totalTasks]);

  if (loading && !refreshing) {
    return <LoadingState message="Calculating productivity reports..." rows={6} />;
  }

  if (error && tasks.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12">
        <ErrorState message={error} onRetry={() => loadReports()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          1. PAGE HEADER
      ================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
              {language === "hi" ? "प्रदर्शन एवं विश्लेषण" : "ANALYTICS & REPORTS"}
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {t("myReports") || "Performance Reports"}
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B] dark:text-[#94A3B8]">
            Individual productivity metrics, task completion rates, and workload distribution.
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
              title="Export your performance report"
            >
              {isExporting ? (
                <RefreshCw size={14} className="animate-spin text-[#0284C7] dark:text-[#38BDF8]" />
              ) : (
                <Download size={14} className="text-[#0284C7] dark:text-[#38BDF8]" />
              )}
              <span>{isExporting ? "Exporting..." : "Export Report"}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {exportMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-[#CBD5E1] bg-white py-1.5 shadow-xl dark:border-[#1E3A47] dark:bg-[#0B202B]">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Choose Format
                </div>
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
            onClick={() => loadReports(true)}
            disabled={refreshing}
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
          2. KPI METRIC STRIP (5 TILES)
      ================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Assigned"
          value={totalTasks}
          subtitle="All lifetime tasks"
          icon={ListTodo}
          variant="primary"
          onClick={() => router.push("/dashboard/tasks")}
        />

        <StatCard
          title="Completed"
          value={completedCount}
          subtitle={`${completedPct}% overall rate`}
          icon={CheckCircle2}
          variant="emerald"
          onClick={() => router.push("/dashboard/tasks?status=COMPLETED")}
        />

        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle={`${inProgressPct}% in flight`}
          icon={Clock3}
          variant="teal"
          onClick={() => router.push("/dashboard/tasks?status=IN_PROGRESS")}
        />

        <StatCard
          title="Pending"
          value={pendingCount}
          subtitle={`${pendingPct}% to do`}
          icon={Clock3}
          variant="amber"
          onClick={() => router.push("/dashboard/tasks?status=PENDING")}
        />

        <StatCard
          title="Overdue"
          value={overdueCount}
          subtitle={overdueCount > 0 ? `${overduePct}% needs attention` : "Zero overdue"}
          icon={AlertTriangle}
          variant="rose"
          onClick={() => router.push("/dashboard/tasks?status=OVERDUE")}
        />
      </div>

      {/* =================================================
          3. TWO-COLUMN DETAILED REPORT PANELS
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: STATUS & PRIORITY PROGRESS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Breakdown Panel */}
          <SectionCard
            title="Status Distribution"
            subtitle="Execution stage of all assigned workload"
            icon={BarChart3}
          >
            <div className="space-y-4">
              <div>
                <ProgressBar
                  percentage={completedPct}
                  label={`Completed (${completedCount} of ${totalTasks})`}
                  color="emerald"
                  size="md"
                />
              </div>

              <div>
                <ProgressBar
                  percentage={inProgressPct}
                  label={`In Progress (${inProgressCount} of ${totalTasks})`}
                  color="blue"
                  size="md"
                />
              </div>

              <div>
                <ProgressBar
                  percentage={pendingPct}
                  label={`Pending To-Do (${pendingCount} of ${totalTasks})`}
                  color="amber"
                  size="md"
                />
              </div>

              {overdueCount > 0 && (
                <div>
                  <ProgressBar
                    percentage={overduePct}
                    label={`Overdue (${overdueCount} of ${totalTasks})`}
                    color="rose"
                    size="md"
                  />
                </div>
              )}
            </div>
          </SectionCard>

          {/* Priority Breakdown Panel */}
          <SectionCard
            title="Priority Distribution"
            subtitle="Urgency breakdown across assigned projects"
            icon={Zap}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#1E3A47] dark:bg-[#102A36]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#DC2626] dark:text-[#F87171]">
                    <Flame size={14} />
                    <span>Urgent Priority</span>
                  </div>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {priorityStats.urgent} ({priorityStats.urgentPct}%)
                  </span>
                </div>
                <ProgressBar percentage={priorityStats.urgentPct} color="rose" size="sm" />
              </div>

              <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#1E3A47] dark:bg-[#102A36]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#D97706] dark:text-[#FBBF24]">
                    <AlertTriangle size={14} />
                    <span>High Priority</span>
                  </div>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {priorityStats.high} ({priorityStats.highPct}%)
                  </span>
                </div>
                <ProgressBar percentage={priorityStats.highPct} color="amber" size="sm" />
              </div>

              <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#1E3A47] dark:bg-[#102A36]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#0284C7] dark:text-[#38BDF8]">
                    <Clock3 size={14} />
                    <span>Medium Priority</span>
                  </div>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {priorityStats.medium} ({priorityStats.mediumPct}%)
                  </span>
                </div>
                <ProgressBar percentage={priorityStats.mediumPct} color="blue" size="sm" />
              </div>

              <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#1E3A47] dark:bg-[#102A36]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-[#00A878] dark:text-[#34D399]">
                    <CheckCircle2 size={14} />
                    <span>Low Priority</span>
                  </div>
                  <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                    {priorityStats.low} ({priorityStats.lowPct}%)
                  </span>
                </div>
                <ProgressBar percentage={priorityStats.lowPct} color="emerald" size="sm" />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT COLUMN: OVERALL EFFICIENCY & SHORTCUTS */}
        <div className="space-y-6">
          {/* Productivity Score Card */}
          <SectionCard
            title="Productivity Score"
            subtitle="Overall execution efficiency"
            icon={TrendingUp}
          >
            <div className="text-center py-4">
              <div className="inline-flex h-28 w-28 items-center justify-center rounded-full border-4 border-[#00A878] bg-[#ECFDF5] dark:border-[#34D399] dark:bg-[#064E3B]/40">
                <div className="text-center">
                  <span className="text-3xl font-extrabold text-[#00A878] dark:text-[#34D399]">
                    {completedPct}%
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#CBD5E1]">
                    Efficiency
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[13px] font-semibold text-[#0F172A] dark:text-white">
                {completedCount} tasks completed out of {totalTasks}
              </p>
              <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {overdueCount === 0
                  ? "Flawless on-time delivery! No overdue tasks."
                  : `${overdueCount} task(s) currently past deadline.`}
              </p>
            </div>
          </SectionCard>

          {/* Quick Shortcuts Card */}
          <SectionCard
            title="Explore Work"
            subtitle="Direct navigation to related views"
            icon={Zap}
          >
            <div className="space-y-2.5">
              <Link
                href="/dashboard/tasks"
                className="flex items-center justify-between rounded-[10px] border border-[#CBD5E1] bg-white p-3 hover:border-[#2563EB] hover:bg-[#F8FAFC] shadow-2xs dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8] dark:hover:bg-[#102A36] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#102A36] dark:text-[#38BDF8]">
                    <ListTodo size={16} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white">
                    Task Management
                  </span>
                </div>
                <ArrowUpRight size={14} className="text-[#64748B] dark:text-[#94A3B8]" />
              </Link>

              <Link
                href="/dashboard/calendar"
                className="flex items-center justify-between rounded-[10px] border border-[#CBD5E1] bg-white p-3 hover:border-[#2563EB] hover:bg-[#F8FAFC] shadow-2xs dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8] dark:hover:bg-[#102A36] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#102A36] dark:text-[#38BDF8]">
                    <CalendarDays size={16} />
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white">
                    Calendar View
                  </span>
                </div>
                <ArrowUpRight size={14} className="text-[#64748B] dark:text-[#94A3B8]" />
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}