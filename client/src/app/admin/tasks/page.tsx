"use client";

import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Eye,
  Filter,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
  ArrowUpRight,
} from "lucide-react";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { useDepartments } from "@/hooks/useDepartments";
import { Modal } from "@/components/ui/Modal";
import { GoToPage } from "@/components/ui/GoToPage";

// =====================================================
// TYPES
// =====================================================

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Employee {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
}

interface Task {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  createdBy?: Employee | string | null;
  assignedTo?: Employee | string | null;
  status?: TaskStatus | string;
  priority?: TaskPriority | string;
  dueDate?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface TaskResponse {
  success?: boolean;
  message?: string;
  data?:
    | Task[]
    | {
        tasks?: Task[];
        total?: number;
        pagination?: {
          total?: number;
          page?: number;
          limit?: number;
          totalPages?: number;
        };
      };
}

interface EmployeeResponse {
  success?: boolean;
  message?: string;
  data?:
    | Employee[]
    | {
        employees?: Employee[];
      };
}

// =====================================================
// HELPERS
// =====================================================

function getTaskId(task: Task): string {
  return task._id || task.id || "";
}

function getTaskTitle(task: Task): string {
  return task.title || "Untitled Task";
}

function getPersonName(person?: Employee | string | null): string {
  if (!person) return "";
  if (typeof person === "string") return person;

  const fullName = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    person.name ||
    person.employeeId ||
    person.email ||
    "Unknown"
  );
}

function getPersonId(person?: Employee | string | null): string {
  if (!person) return "";
  if (typeof person === "string") return person;
  return person._id || person.id || "";
}

function formatDate(date?: string, language: string = "en") {
  if (!date) return language === "hi" ? "कोई देय तिथि नहीं" : "No due date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return language === "hi" ? "अमान्य तिथि" : "Invalid date";

  return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRangeLabel(fromStr?: string, toStr?: string, language: string = "en"): string {
  if (!fromStr || !toStr) return language === "hi" ? "कस्टम तिथि सीमा" : "Custom Date Range";
  try {
    const [fY, fM, fD] = fromStr.split("-").map(Number);
    const [tY, tM, tD] = toStr.split("-").map(Number);
    const fromDate = new Date(fY, fM - 1, fD);
    const toDate = new Date(tY, tM - 1, tD);
    const fDay = String(fD).padStart(2, "0");
    const tDay = String(tD).padStart(2, "0");
    const fMonth = fromDate.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { month: "short" });
    const tMonth = toDate.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { month: "short" });
    return `${fDay} ${fMonth} - ${tDay} ${tMonth}`;
  } catch {
    return `${fromStr} - ${toStr}`;
  }
}

function isOverdue(task: Task) {
  if (!task.dueDate || task.status?.toUpperCase() === "COMPLETED") {
    return false;
  }
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

// Avatar palette for initial badges
const AVATAR_THEMES = [
  { bg: "bg-[#DBEAFE] dark:bg-[#1E3A5F]", text: "text-[#1D4ED8] dark:text-[#93C5FD]" },
  { bg: "bg-[#CCFBF1] dark:bg-[#134E4A]", text: "text-[#0F766E] dark:text-[#5EEAD4]" },
  { bg: "bg-[#EDE9FE] dark:bg-[#3B0764]", text: "text-[#6D28D9] dark:text-[#C4B5FD]" },
  { bg: "bg-[#FEF3C7] dark:bg-[#451A03]", text: "text-[#B45309] dark:text-[#FCD34D]" },
  { bg: "bg-[#FCE7F3] dark:bg-[#500724]", text: "text-[#BE185D] dark:text-[#F472B6]" },
  { bg: "bg-[#E0E7FF] dark:bg-[#1E1B4B]", text: "text-[#4338CA] dark:text-[#A5B4FC]" },
];

function getAvatarTheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_THEMES[Math.abs(hash) % AVATAR_THEMES.length];
}

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "UN";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

// =====================================================
// MINI BAR SPARKLINE CHART COMPONENT
// =====================================================

function StatMiniBarChart({
  color,
  bars = [35, 55, 40, 70, 60, 85, 100],
}: {
  color: string;
  bars?: number[];
}) {
  return (
    <div className="flex items-end gap-[3px] h-[34px] w-[46px] shrink-0" aria-hidden="true">
      {bars.map((heightPercent, idx) => (
        <span
          key={idx}
          className="w-[3.5px] rounded-full transition-all duration-300"
          style={{
            height: `${Math.max(heightPercent, 18)}%`,
            backgroundColor: color,
            opacity: 0.35 + (idx / bars.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

// =====================================================
// STATUS BADGE (COMPACT 11px WITH ICONS)
// =====================================================

function StatusBadge({ status }: { status?: string }) {
  const { t } = useLanguage();
  const normalized = status?.toUpperCase() || "PENDING";

  if (normalized === "COMPLETED") {
    return (
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-emerald-300 bg-[#ECFDF5] px-2.5 text-[12px] font-semibold leading-[16px] text-[#00875A] dark:border-emerald-700 dark:bg-[#064E3B]/60 dark:text-[#34D399]">
        <CheckCircle2 size={12} strokeWidth={2.2} className="shrink-0 text-[#00875A] dark:text-[#34D399]" />
        {t("status.completed") || "Completed"}
      </span>
    );
  }

  if (normalized === "IN_PROGRESS") {
    return (
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-sky-300 bg-[#EFF6FF] px-2.5 text-[12px] font-semibold leading-[16px] text-[#0284C7] dark:border-sky-700 dark:bg-[#1E3A5F]/60 dark:text-[#38BDF8]">
        <Clock3 size={12} strokeWidth={2.2} className="shrink-0 text-[#0284C7] dark:text-[#38BDF8]" />
        {t("status.in_progress") || "In Progress"}
      </span>
    );
  }

  return (
    <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-amber-300 bg-[#FFFBEB] px-2.5 text-[12px] font-semibold leading-[16px] text-[#D97706] dark:border-amber-700 dark:bg-[#451A03]/60 dark:text-[#FBBF24]">
      <Clock3 size={12} strokeWidth={2.2} className="shrink-0 text-[#D97706] dark:text-[#FBBF24]" />
      {t("status.pending") || "Pending"}
    </span>
  );
}

// =====================================================
// PRIORITY BADGE (COMPACT 12px TINTED)
// =====================================================

function PriorityBadge({ priority }: { priority?: string }) {
  const { t } = useLanguage();
  const normalized = priority?.toUpperCase() || "MEDIUM";

  if (normalized === "URGENT") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-rose-300 bg-[#FEF2F2] px-2 text-[12px] font-semibold leading-[16px] text-[#DC2626] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        {t("priority.urgent") || "Urgent"}
      </span>
    );
  }

  if (normalized === "HIGH") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-amber-300 bg-[#FFFBEB] px-2 text-[12px] font-semibold leading-[16px] text-[#D97706] dark:border-amber-800 dark:bg-amber-950/60 dark:text-[#FBBF24]">
        {t("priority.high") || "High"}
      </span>
    );
  }

  if (normalized === "LOW") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-emerald-300 bg-[#ECFDF5] px-2 text-[12px] font-semibold leading-[16px] text-[#059669] dark:border-emerald-800 dark:bg-[#064E3B]/60 dark:text-[#34D399]">
        {t("priority.low") || "Low"}
      </span>
    );
  }

  return (
    <span className="inline-flex h-[22px] items-center rounded-[6px] border border-sky-300 bg-[#F0F9FF] px-2 text-[12px] font-semibold leading-[16px] text-[#0284C7] dark:border-sky-800 dark:bg-sky-950/60 dark:text-[#38BDF8]">
      {t("priority.medium") || "Medium"}
    </span>
  );
}

// =====================================================
// MAIN PAGE CONTENT
// =====================================================

function normalizeTaskStatusParam(param: string | null): {
  status: string;
  dateFilter: string;
} {
  if (!param) return { status: "ALL", dateFilter: "ALL" };
  const upper = param.toUpperCase().trim();
  if (upper === "COMPLETED") return { status: "COMPLETED", dateFilter: "ALL" };
  if (upper === "PENDING") return { status: "PENDING", dateFilter: "ALL" };
  if (upper === "IN_PROGRESS" || upper === "INPROGRESS" || upper === "IN-PROGRESS")
    return { status: "IN_PROGRESS", dateFilter: "ALL" };
  if (upper === "OVERDUE") return { status: "ALL", dateFilter: "OVERDUE" };
  return { status: "ALL", dateFilter: "ALL" };
}

function AdminTasksContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilter = useMemo(() => {
    const rawParam = searchParams.get("status") || searchParams.get("status_text");
    return normalizeTaskStatusParam(rawParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taskIdParam = searchParams.get("taskId") || "";

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(initialFilter.status);
  const [priority, setPriority] = useState("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>(searchParams.get("department") || "ALL");
  const [dateFilter, setDateFilter] = useState<string>(initialFilter.dateFilter);
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });

  const [customDateRange, setCustomDateRange] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");
  const [customDateError, setCustomDateError] = useState("");

  // Employee dropdown search & popover states
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const employeeDropdownRef = useRef<HTMLDivElement>(null);
  const employeeSearchInputRef = useRef<HTMLInputElement>(null);

  // Close employee dropdown on click outside or Escape key
  useEffect(() => {
    if (!isEmployeeDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsEmployeeDropdownOpen(false);
        setEmployeeSearchQuery("");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsEmployeeDropdownOpen(false);
        setEmployeeSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEmployeeDropdownOpen]);

  // Focus employee search input upon dropdown opening
  useEffect(() => {
    if (isEmployeeDropdownOpen) {
      const timer = setTimeout(() => {
        employeeSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEmployeeDropdownOpen]);

  // Real-time case-insensitive employee search filter
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees;
    const q = employeeSearchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const name = getPersonName(emp).toLowerCase();
      return name.includes(q);
    });
  }, [employees, employeeSearchQuery]);

  // Determine whether "All Employees" option matches current search query
  const showAllEmployeesOption = useMemo(() => {
    if (!employeeSearchQuery.trim()) return true;
    const q = employeeSearchQuery.toLowerCase().trim();
    const allLabel = (
      t("tasks.allEmployees") ||
      (language === "hi" ? "सभी कर्मचारी" : "All Employees")
    ).toLowerCase();
    return allLabel.includes(q);
  }, [employeeSearchQuery, language, t]);

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync with URL parameters when searchParams change (Back/Forward or direct navigation)
  useEffect(() => {
    const rawParam = searchParams.get("status") || searchParams.get("status_text");
    const { status: targetStatus, dateFilter: targetDateFilter } = normalizeTaskStatusParam(rawParam);

    const deptParam = searchParams.get("department");
    if (deptParam) {
      setDepartmentFilter(deptParam);
    }

    setStatus((prev) => (prev !== targetStatus ? targetStatus : prev));
    setDateFilter((prev) => {
      if (targetDateFilter === "OVERDUE") return "OVERDUE";
      if (prev === "OVERDUE" && targetDateFilter !== "OVERDUE") return "ALL";
      return prev;
    });
    setPage(1);
  }, [searchParams]);

  // Synchronize task status filter changes with URL
  const syncTaskUrl = (newStatus: string, newDateFilter: string) => {
    const currentStatusInUrl = (searchParams.get("status") || searchParams.get("status_text"))?.toLowerCase() || "";
    let targetParam = "";

    if (newDateFilter === "OVERDUE") {
      targetParam = "overdue";
    } else if (newStatus === "COMPLETED") {
      targetParam = "completed";
    } else if (newStatus === "PENDING") {
      targetParam = "pending";
    } else if (newStatus === "IN_PROGRESS") {
      targetParam = "in_progress";
    }

    if (targetParam !== currentStatusInUrl) {
      const params = new URLSearchParams(searchParams.toString());
      if (targetParam) {
        params.set("status", targetParam);
      } else {
        params.delete("status");
      }
      params.delete("status_text");
      const query = params.toString();
      const newPath = query ? `/admin/tasks?${query}` : `/admin/tasks`;
      router.push(newPath, { scroll: false });
    }
  };

  // Auto-open task modal if taskId in URL
  useEffect(() => {
    if (taskIdParam && tasks.length > 0) {
      const found = tasks.find((item) => (item._id || item.id) === taskIdParam);
      if (found) {
        setSelectedTask(found);
      }
    }
  }, [taskIdParam, tasks]);

  // Fetch Tasks + Employees
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [taskResponse, employeeResponse] = await Promise.all([
        apiRequest<TaskResponse>("/api/tasks?limit=1000", { method: "GET" }),
        apiRequest<EmployeeResponse>("/api/users/employees", { method: "GET" }),
      ]);

      const taskData = taskResponse?.data;
      const employeeData = employeeResponse?.data;

      const taskList = Array.isArray(taskData) ? taskData : taskData?.tasks ?? [];
      const employeeList = Array.isArray(employeeData)
        ? employeeData
        : employeeData?.employees ?? [];

      setTasks(taskList);
      setEmployees(employeeList);
    } catch (err: any) {
      console.error("[TASKS] Load error:", err);
      setError(err?.message || "Failed to load task management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const title = task.title?.toLowerCase() || "";
      const description = task.description?.toLowerCase() || "";
      const assignedName = getPersonName(task.assignedTo).toLowerCase();

      // Search match
      const matchesSearch =
        !query ||
        title.includes(query) ||
        description.includes(query) ||
        assignedName.includes(query);

      // Status match
      const taskStatusNormalized = (() => {
        const s = task.status?.toUpperCase();
        if (s === "COMPLETED") return "COMPLETED";
        if (s === "IN_PROGRESS") return "IN_PROGRESS";
        return "PENDING";
      })();

      const matchesStatus = status === "ALL" || taskStatusNormalized === status;

      // Priority match
      const matchesPriority =
        priority === "ALL" || task.priority?.toUpperCase() === priority;

      // Assignee match
      const matchesAssignee =
        assignee === "ALL" || getPersonId(task.assignedTo) === assignee;

      // Department match
      const assignedDept =
        typeof task.assignedTo === "object" && task.assignedTo !== null
          ? (task.assignedTo as any).department
          : "";
      const matchesDepartment =
        departmentFilter === "ALL" ||
        (Boolean(assignedDept) && assignedDept.toLowerCase() === departmentFilter.toLowerCase());

      // Date match
      let matchesDate = true;
      if (dateFilter !== "ALL" && task.dueDate) {
        const due = new Date(task.dueDate);
        const now = new Date();

        if (dateFilter === "OVERDUE") {
          matchesDate = due.getTime() < now.getTime() && task.status !== "COMPLETED";
        }
        if (dateFilter === "TODAY") {
          matchesDate = due.toDateString() === now.toDateString();
        }
        if (dateFilter === "UPCOMING") {
          matchesDate = due.getTime() > now.getTime();
        }
        if (dateFilter === "CUSTOM") {
          if (!customDateRange?.from || !customDateRange?.to) {
            matchesDate = true;
          } else {
            const [fY, fM, fD] = customDateRange.from.split("-").map(Number);
            const fromTimestamp = new Date(fY, fM - 1, fD, 0, 0, 0, 0).getTime();
            const [tY, tM, tD] = customDateRange.to.split("-").map(Number);
            const toTimestamp = new Date(tY, tM - 1, tD, 23, 59, 59, 999).getTime();

            const taskYear = due.getFullYear();
            const taskMonth = String(due.getMonth() + 1).padStart(2, "0");
            const taskDay = String(due.getDate()).padStart(2, "0");
            const localDateStr = `${taskYear}-${taskMonth}-${taskDay}`;

            const utcYear = due.getUTCFullYear();
            const utcMonth = String(due.getUTCMonth() + 1).padStart(2, "0");
            const utcDay = String(due.getUTCDate()).padStart(2, "0");
            const utcDateStr = `${utcYear}-${utcMonth}-${utcDay}`;

            const inLocalRange =
              localDateStr >= customDateRange.from && localDateStr <= customDateRange.to;
            const inUtcRange =
              utcDateStr >= customDateRange.from && utcDateStr <= customDateRange.to;
            const inTimestampRange =
              due.getTime() >= fromTimestamp && due.getTime() <= toTimestamp;

            matchesDate = inLocalRange || inUtcRange || inTimestampRange;
          }
        }
      } else if (dateFilter === "CUSTOM" && !task.dueDate) {
        matchesDate = false;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesDepartment &&
        matchesDate
      );
    });
  }, [tasks, search, status, priority, assignee, departmentFilter, dateFilter, customDateRange]);

  const hasActiveFilters =
    Boolean(search) ||
    status !== "ALL" ||
    priority !== "ALL" ||
    assignee !== "ALL" ||
    departmentFilter !== "ALL" ||
    dateFilter !== "ALL" ||
    Boolean(customDateRange);

  const hasFilters = hasActiveFilters;

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setPriority("ALL");
    setAssignee("ALL");
    setDepartmentFilter("ALL");
    setDateFilter("ALL");
    setCustomDateRange(null);
    setIsEmployeeDropdownOpen(false);
    setEmployeeSearchQuery("");
    syncTaskUrl("ALL", "ALL");
  };

  // Metrics calculations
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => {
    const s = task.status?.toUpperCase();
    return s === "PENDING" || (s !== "IN_PROGRESS" && s !== "COMPLETED");
  }).length;
  const inProgressTasks = tasks.filter(
    (task) => task.status?.toUpperCase() === "IN_PROGRESS"
  ).length;
  const completedTasks = tasks.filter(
    (task) => task.status?.toUpperCase() === "COMPLETED"
  ).length;
  const overdueTasks = tasks.filter(isOverdue).length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = filteredTasks.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, status, priority, assignee, departmentFilter, dateFilter]);

  // Delete Task Handler
  const handleDeleteTask = async () => {
    if (!deleteTask) return;
    const taskId = getTaskId(deleteTask);
    if (!taskId) return;

    try {
      setDeleting(true);
      const res = await apiRequest<{ success?: boolean; message?: string }>(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        { method: "DELETE" }
      );

      setTasks((prev) => prev.filter((task) => getTaskId(task) !== taskId));
      setDeleteTask(null);
      setSelectedTask(null);
      showToast.success(res?.message || "Task deleted successfully.");
    } catch (err: any) {
      console.error("[TASKS] Delete error:", err);
      showToast.error(err?.message || "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  };

  // Find assignee label for active chip
  const activeAssigneeName = useMemo(() => {
    if (assignee === "ALL") return null;
    const found = employees.find((emp) => (emp._id || emp.id) === assignee);
    return found ? getPersonName(found) : "Selected Employee";
  }, [assignee, employees]);

  // ===================================================
  // LOADING SKELETON STATE
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071926] px-4 sm:px-8 py-6 sm:py-7">
        <div className="mx-auto max-w-[1550px] animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-7 w-40 rounded-lg bg-[#E2E8F0] dark:bg-[#18333F]" />
              <div className="h-4 w-72 rounded bg-[#E2E8F0] dark:bg-[#18333F]" />
            </div>
            <div className="h-10 w-36 rounded-lg bg-[#E2E8F0] dark:bg-[#18333F]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[96px] rounded-[12px] bg-white border border-[#E2E8F0] dark:border-[#2A4858] dark:bg-[#102A38]" />
            ))}
          </div>
          <div className="h-[520px] rounded-[14px] bg-white border border-[#E2E8F0] dark:border-[#2A4858] dark:bg-[#102A38]" />
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error && tasks.length === 0) {
    return (
      <main className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-[#F5F9FC] p-6 dark:bg-[#071926]">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-950 dark:bg-[#102A38]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={24} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#063B61] dark:text-white">
            {t("common.error") || "Unable to Load Tasks"}
          </h2>
          <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
            {error}
          </p>
          <button
            type="button"
            onClick={loadData}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#042741] dark:bg-[#0879D9] dark:hover:bg-[#0665B5] cursor-pointer"
          >
            {t("tryAgain") || "Try Again"}
          </button>
        </div>
      </main>
    );
  }

  // ===================================================
  // MAIN ENTERPRISE UI
  // ===================================================

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] text-[#334155] dark:bg-[#071926] dark:text-[#E5F1F5] px-4 sm:px-8 py-6 sm:py-7">
      <div className="mx-auto max-w-[1550px] flex flex-col">

        {/* =================================================
            1. PAGE HEADER (CLEAN ENTERPRISE SAAS DASHBOARD)
        ================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8] mb-1">
              {language === "hi" ? "कार्य प्रबंधन प्रणाली" : "TASK MANAGEMENT"}
            </div>
            <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#0F172A] dark:text-white leading-[34px]">
              {t("common.tasks") || "Tasks"}
            </h1>
            <p className="mt-1 text-[13px] font-normal leading-[20px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi"
                ? "अपने पूरे संगठन में प्रत्येक कार्य का प्रबंधन, असाइनमेंट और निगरानी करें।"
                : "Manage, assign and monitor every task across your organization."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => router.push("/admin/tasks/create")}
              className="inline-flex h-[38px] sm:h-[40px] items-center justify-center gap-2 rounded-[9px] bg-[#063B61] hover:bg-[#032F4D] px-4 sm:px-4.5 text-[13px] font-semibold leading-[18px] text-white shadow-xs border border-[#12456B] transition-all duration-150 active:scale-[0.98] dark:bg-[#0879D9] dark:hover:bg-[#0665B5] cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>{t("tasks.createTask") || (language === "hi" ? "कार्य बनाएं" : "Create Task")}</span>
            </button>
          </div>
        </div>

        {/* =================================================
            2. TOP STATISTICS GRID (5 COMPACT CARDS WITH SPARKLINES)
        ================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4 mb-6 sm:mb-7">
          
          {/* CARD 1: TOTAL TASKS */}
          <button
            type="button"
            onClick={clearFilters}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
              status === "ALL" &&
              priority === "ALL" &&
              assignee === "ALL" &&
              dateFilter === "ALL" &&
              !search
                ? "border-[#00A6C7] bg-[#EFF8FB] ring-1 ring-[#00A6C7]/30 dark:border-[#00A6C7] dark:bg-[#123C46]/40"
                : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#FAFDFE] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <Briefcase size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("dashboard.totalTasks") || "Total Tasks"}
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
                  {totalTasks}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                  <span>{language === "hi" ? "संगठन कार्यबल" : "Organization"}</span>
                </div>
              </div>
              <StatMiniBarChart color="#00A6C7" bars={[32, 50, 42, 68, 55, 80, 100]} />
            </div>
          </button>

          {/* CARD 2: PENDING */}
          <button
            type="button"
            onClick={() => {
              clearFilters();
              setStatus("PENDING");
              syncTaskUrl("PENDING", "ALL");
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
              status === "PENDING"
                ? "border-amber-400 bg-[#FFFDF5] ring-1 ring-amber-400/30 dark:border-amber-600 dark:bg-amber-950/30"
                : "border-[#CBD5E1] bg-white hover:border-amber-400 hover:bg-[#FFFDF7] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#FFFBEB] text-[#F2A51A] dark:bg-[#451A03] dark:text-[#FBBF24]">
                  <Clock3 size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("dashboard.pending") || "Pending"}
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
                  {pendingTasks}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#D97706] dark:text-[#FBBF24]">
                  <span>{language === "hi" ? "शुरू नहीं हुआ" : "Not started"}</span>
                </div>
              </div>
              <StatMiniBarChart color="#F59E0B" bars={[25, 42, 38, 70, 58, 85, 95]} />
            </div>
          </button>

          {/* CARD 3: IN PROGRESS */}
          <button
            type="button"
            onClick={() => {
              clearFilters();
              setStatus("IN_PROGRESS");
              syncTaskUrl("IN_PROGRESS", "ALL");
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
              status === "IN_PROGRESS"
                ? "border-sky-400 bg-[#F0F9FF] ring-1 ring-sky-400/30 dark:border-sky-600 dark:bg-sky-950/30"
                : "border-[#CBD5E1] bg-white hover:border-sky-400 hover:bg-[#F9FBFE] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#EFF6FF] text-[#0284C7] dark:bg-[#1E3A5F] dark:text-[#38BDF8]">
                  <Clock3 size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("dashboard.inProgress") || "In Progress"}
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
                  {inProgressTasks}
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
            onClick={() => {
              clearFilters();
              setStatus("COMPLETED");
              syncTaskUrl("COMPLETED", "ALL");
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${
              status === "COMPLETED"
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
                  {t("dashboard.completed") || "Completed"}
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
                  {completedTasks}
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
            onClick={() => {
              clearFilters();
              setDateFilter("OVERDUE");
              syncTaskUrl("ALL", "OVERDUE");
            }}
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
                  {t("dashboard.overdue") || "Overdue"}
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
                  {overdueTasks}
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
                {/* FILTERS INDICATOR */}
                <div className="inline-flex h-[38px] items-center gap-2 rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] px-3 text-[13px] font-medium leading-[18px] text-[#475569] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#CBD5E1]">
                  <Filter size={14} className="text-[#087D8F] dark:text-[#4CD2DA]" />
                  <span>{t("common.filters") || "Filters"}</span>
                </div>

                {/* STATUS FILTER */}
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatus(newStatus);
                      const newDateFilter = dateFilter === "OVERDUE" ? "ALL" : dateFilter;
                      if (dateFilter === "OVERDUE") {
                        setDateFilter("ALL");
                      }
                      syncTaskUrl(newStatus, newDateFilter);
                    }}
                    className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                      status !== "ALL"
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
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                      priority !== "ALL"
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

                {/* EMPLOYEE FILTER */}
                <div ref={employeeDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEmployeeDropdownOpen((prev) => !prev);
                      setEmployeeSearchQuery("");
                    }}
                    className={`flex h-[38px] max-w-[190px] items-center truncate rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer text-left ${
                      assignee !== "ALL"
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                        : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                    }`}
                  >
                    <span className="truncate">
                      {assignee !== "ALL"
                        ? activeAssigneeName || (language === "hi" ? "कर्मचारी चुना गया" : "Selected Employee")
                        : (t("tasks.allEmployees") || (language === "hi" ? "सभी कर्मचारी" : "All Employees"))}
                    </span>
                  </button>
                  <ChevronDown
                    size={14}
                    className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8] transition-transform duration-200 ${
                      isEmployeeDropdownOpen ? "rotate-180" : ""
                    }`}
                  />

                  {/* EMPLOYEE DROPDOWN POPOVER */}
                  {isEmployeeDropdownOpen && (
                    <div
                      style={{ width: "230px", maxWidth: "230px" }}
                      className="absolute left-0 top-full mt-1.5 z-50 w-[230px] max-w-[230px] rounded-[10px] border border-[#CBD5E1] bg-white shadow-xl dark:border-[#2A4858] dark:bg-[#102A38] overflow-hidden"
                    >
                      {/* SEARCH INPUT */}
                      <div className="p-2 border-b border-[#E2E8F0] dark:border-[#2A4858]">
                        <div className="flex items-center gap-2 rounded-[6px] border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1.5 focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]/20 dark:border-[#2A4858] dark:bg-[#0D2430]">
                          <Search size={13} className="shrink-0 text-[#64748B] dark:text-[#94A3B8]" />
                          <input
                            ref={employeeSearchInputRef}
                            type="text"
                            value={employeeSearchQuery}
                            onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                            placeholder={language === "hi" ? "कर्मचारी खोजें..." : "Search employees..."}
                            className="w-full bg-transparent text-[12px] font-medium text-[#0F172A] outline-none placeholder:text-[#94A3B8] dark:text-[#CBD5E1] dark:placeholder:text-[#64748B]"
                          />
                          {employeeSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEmployeeSearchQuery("")}
                              className="text-[#94A3B8] hover:text-[#64748B] dark:hover:text-[#CBD5E1] cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* SCROLLABLE LIST - SCROLLBAR HIDDEN */}
                      <div
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                        className="max-h-[220px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1"
                      >
                        {/* ALL EMPLOYEES OPTION */}
                        {showAllEmployeesOption && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignee("ALL");
                              setIsEmployeeDropdownOpen(false);
                              setEmployeeSearchQuery("");
                            }}
                            className={`flex w-full items-center px-3 py-2 text-left text-[13px] transition cursor-pointer ${
                              assignee === "ALL"
                                ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                                : "font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                            }`}
                          >
                            <span className="truncate">
                              {t("tasks.allEmployees") || (language === "hi" ? "सभी कर्मचारी" : "All Employees")}
                            </span>
                          </button>
                        )}

                        {/* MATCHING EMPLOYEES */}
                        {filteredEmployees.map((emp) => {
                          const id = emp._id || emp.id;
                          if (!id) return null;
                          const isSelected = assignee === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setAssignee(id);
                                setIsEmployeeDropdownOpen(false);
                                setEmployeeSearchQuery("");
                              }}
                              className={`flex w-full items-center px-3 py-2 text-left text-[13px] transition cursor-pointer ${
                                isSelected
                                  ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                                  : "font-medium text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                              }`}
                            >
                              <span className="truncate">{getPersonName(emp)}</span>
                            </button>
                          );
                        })}

                        {/* NO RESULTS FOUND */}
                        {!showAllEmployeesOption && filteredEmployees.length === 0 && (
                          <div className="py-4 text-center text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                            {language === "hi" ? "कोई कर्मचारी नहीं मिला" : "No employees found"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* DEPARTMENT FILTER */}
                <div className="relative">
                  <select
                    value={departmentFilter}
                    onChange={(e) => {
                      const newDept = e.target.value;
                      setDepartmentFilter(newDept);
                      const params = new URLSearchParams(searchParams.toString());
                      if (newDept !== "ALL") {
                        params.set("department", newDept);
                      } else {
                        params.delete("department");
                      }
                      router.push(params.toString() ? `/admin/tasks?${params.toString()}` : `/admin/tasks`, { scroll: false });
                    }}
                    className={`h-[38px] max-w-[190px] appearance-none truncate rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                      departmentFilter !== "ALL"
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                        : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                    }`}
                  >
                    <option value="ALL">{language === "hi" ? "सभी विभाग" : "All Departments"}</option>
                    {masterDeptNames.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                  />
                </div>

                {/* DATES FILTER */}
                <div className="relative">
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "CUSTOM") {
                        setTempFromDate(customDateRange?.from || "");
                        setTempToDate(customDateRange?.to || "");
                        setCustomDateError("");
                        setIsCustomDateModalOpen(true);
                      } else {
                        setDateFilter(val);
                        setCustomDateRange(null);
                        syncTaskUrl(status, val);
                      }
                    }}
                    className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium leading-[18px] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:bg-[#0D2430] cursor-pointer ${
                      dateFilter !== "ALL"
                        ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                        : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                    }`}
                  >
                    <option value="ALL">{language === "hi" ? "सभी तिथियां" : "All Dates"}</option>
                    <option value="TODAY">{language === "hi" ? "आज देय" : "Due Today"}</option>
                    <option value="UPCOMING">{language === "hi" ? "आगामी" : "Upcoming"}</option>
                    <option value="OVERDUE">{language === "hi" ? "अतिदेय" : "Overdue"}</option>
                    <option value="CUSTOM">
                      {customDateRange
                        ? formatRangeLabel(customDateRange.from, customDateRange.to, language)
                        : (language === "hi" ? "कस्टम तिथि सीमा" : "Custom Date Range")}
                    </option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
                  />
                </div>

                {/* CLEAR ACTIVE FILTERS */}
                {hasActiveFilters && (
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

              {/* RIGHT: SEARCH BOX */}
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
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="w-full overflow-x-auto responsive-table-scroll">
            <table className="enterprise-table w-full min-w-[850px] text-left border-collapse table-fixed border border-[#CBD5E1] dark:border-[#1E3A47]">
              <thead className="border-b border-[#CBD5E1] bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#102A36]">
                <tr className="h-[40px] text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1] border-b border-[#CBD5E1] dark:border-[#1E3A47]">
                  <th className="w-[34%] px-5 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("tasks.task") || (language === "hi" ? "कार्य" : "TASK")}</th>
                  <th className="w-[18%] px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("tasks.assignedTo") || (language === "hi" ? "असाइन किया गया" : "ASSIGNED TO")}</th>
                  <th className="w-[11%] px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("tasks.priority") || (language === "hi" ? "प्राथमिकता" : "PRIORITY")}</th>
                  <th className="w-[14%] px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("tasks.dueDate") || (language === "hi" ? "नियत तिथि" : "DUE DATE")}</th>
                  <th className="w-[11%] px-4 py-2.5 font-semibold border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("tasks.status") || (language === "hi" ? "स्थिति" : "STATUS")}</th>
                  <th className="w-[12%] px-11 py-2.5 font-semibold text-right border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("common.actions") || (language === "hi" ? "कार्रवाई" : "ACTIONS")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
                {paginatedTasks.length === 0 ? (
                  <tr className="bg-white dark:bg-[#0B202B]">
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                        <ClipboardList size={22} />
                      </div>
                      <p className="mt-3 text-[14px] font-semibold text-[#0F172A] dark:text-[#E5F1F5]">
                        {t("tasks.noTasksFound") || (language === "hi" ? "कोई कार्य नहीं मिला" : "No tasks found")}
                      </p>
                      <p className="mt-1 text-[12px] font-normal text-[#64748B] dark:text-[#8FA8B2]">
                        {language === "hi"
                          ? "फ़िल्टर या खोज बदल कर देखें, या एक नया कार्य बनाएं।"
                          : "Try adjusting your filters or search keywords, or create a new task."}
                      </p>
                      <button
                        type="button"
                        onClick={() => router.push("/admin/tasks/create")}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#063B61] hover:bg-[#042741] px-4 py-2 text-[13px] font-semibold text-white shadow-xs transition cursor-pointer dark:bg-[#0879D9] dark:hover:bg-[#0665B5]"
                      >
                        <Plus size={14} />
                        <span>{t("tasks.createTask") || (language === "hi" ? "कार्य बनाएं" : "Create Task")}</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedTasks.map((task, index) => {
                    const taskId = getTaskId(task);
                    const overdue = isOverdue(task);
                    const assignedName = getPersonName(task.assignedTo);
                    const assignedDept =
                      typeof task.assignedTo === "object"
                        ? task.assignedTo?.department
                        : undefined;

                    const avatarTheme = getAvatarTheme(assignedName || "Unassigned");

                    return (
                      <tr
                        key={taskId || index}
                        onClick={() => {
                          if (taskId) {
                            router.push(`/admin/tasks/${taskId}`);
                          }
                        }}
                        className="group h-[58px] cursor-pointer bg-white border-b border-[#E5E7EB] transition-colors duration-150 hover:bg-[#F8FAFC] dark:bg-[#0B202B] dark:border-[#18333F] dark:hover:bg-[#102A36]"
                      >
                        {/* 1. TASK CELL */}
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA] border border-[#CBD5E1] dark:border-[#2A4858]">
                              <ClipboardList size={16} strokeWidth={2.2} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-semibold leading-[20px] text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                                {getTaskTitle(task)}
                              </p>
                              <p className="truncate text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                                {task.description || (language === "hi" ? "कोई विवरण उपलब्ध नहीं" : "No description provided")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. ASSIGNED TO */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] font-semibold text-xs ${avatarTheme.bg} ${avatarTheme.text}`}
                            >
                              {getInitials(assignedName)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0F172A] dark:text-white">
                                {assignedName || (
                                  <span className="font-normal text-[#64748B] dark:text-[#8FA8B2]">
                                    {language === "hi" ? "अवर्गीकृत" : "Unassigned"}
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                                {assignedDept || (assignedName ? (language === "hi" ? "सामान्य" : "General") : "—")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 3. PRIORITY */}
                        <td className="px-4 py-2.5">
                          <PriorityBadge priority={task.priority} />
                        </td>

                        {/* 4. DUE DATE */}
                        <td className="px-4 py-2.5">
                          <div
                            className={`inline-flex items-center gap-1.5 ${
                              overdue
                                ? "text-[12px] font-semibold text-[#DC2626] dark:text-rose-300 bg-[#FFF1F2] dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 px-2 py-0.5 rounded-[6px]"
                                : "text-[13px] font-medium leading-[18px] text-[#334155] dark:text-[#CBD5E1] tabular-nums"
                            }`}
                          >
                            <CalendarDays
                              size={13}
                              className={overdue ? "text-[#DC2626]" : "text-[#64748B] dark:text-[#8FA8B2]"}
                            />
                            <span>{formatDate(task.dueDate, language)}</span>
                          </div>
                        </td>

                        {/* 5. STATUS */}
                        <td className="px-4 py-2.5">
                          <StatusBadge status={task.status} />
                        </td>

                        {/* 6. ACTIONS */}
                        <td
                          className="px-6 py-2.5 text-right cursor-default"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* VIEW */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (taskId) {
                                   router.push(`/admin/tasks/${taskId}`);
                                }
                              }}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-[#CBD5E1] bg-white text-[#063B61] hover:border-[#2563EB] hover:bg-[#EFF8FB] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#4CD2DA] dark:hover:bg-[#123C46] transition shadow-2xs cursor-pointer"
                              title={t("common.view") || (language === "hi" ? "कार्य देखें" : "View task")}
                              aria-label={t("common.view") || (language === "hi" ? "कार्य देखें" : "View task")}
                            >
                              <Eye size={13} strokeWidth={2.2} />
                            </button>

                            {/* EDIT */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (taskId) {
                                  router.push(`/admin/tasks/${taskId}/edit`);
                                }
                              }}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-[#CBD5E1] bg-white text-[#D97706] hover:border-[#F59E0B] hover:bg-[#FFFBEB] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#FBBF24] dark:hover:bg-[#3A321F] transition shadow-2xs cursor-pointer"
                              title={t("common.edit") || (language === "hi" ? "कार्य संपादित करें" : "Edit task")}
                              aria-label={t("common.edit") || (language === "hi" ? "कार्य संपादित करें" : "Edit task")}
                            >
                              <Pencil size={13} strokeWidth={2.2} />
                            </button>

                            {/* DELETE */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTask(task);
                              }}
                              className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] border border-rose-300 bg-[#FFF1F2] text-[#DC2626] hover:bg-[#FFE4E6] dark:border-rose-900 dark:bg-[#3D1E24] dark:text-rose-400 transition shadow-2xs cursor-pointer"
                              title={t("common.delete") || (language === "hi" ? "कार्य हटाएं" : "Delete task")}
                              aria-label={t("common.delete") || (language === "hi" ? "कार्य हटाएं" : "Delete task")}
                            >
                              <Trash2 size={13} strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER / PAGINATION */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#CBD5E1] bg-[#F8FAFC] px-4 sm:px-5 py-3 dark:border-[#2A4858] dark:bg-[#0D2430]/40">
            <p className="text-[13px] font-normal leading-[20px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi" ? (
                <>
                  दिखाया जा रहा है{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {filteredTasks.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {Math.min(safePage * pageSize, filteredTasks.length)}
                  </span>{" "}
                  कुल{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {filteredTasks.length}
                  </span>{" "}
                  कार्य
                </>
              ) : (
                <>
                  Showing{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {filteredTasks.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                  </span>{" "}
                  –{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {Math.min(safePage * pageSize, filteredTasks.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {filteredTasks.length}
                  </span>{" "}
                  tasks
                </>
              )}
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-[#CBD5E1] bg-white text-[#475569] shadow-2xs hover:bg-[#F5F9FC] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#8FA8B2] dark:hover:bg-[#18333F] transition cursor-pointer"
                  aria-label={language === "hi" ? "पिछला पृष्ठ" : "Previous Page"}
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                  const num = idx + 1;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      className={`flex h-[30px] min-w-[30px] items-center justify-center rounded-[6px] px-2 text-[12px] font-semibold leading-none transition cursor-pointer ${
                        safePage === num
                          ? "bg-[#063B61] text-white shadow-xs dark:bg-[#0879D9]"
                          : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F5F9FC] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#8FA8B2] dark:hover:bg-[#18333F]"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}

                {safePage > 5 && safePage < totalPages && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button
                      type="button"
                      className="flex h-[30px] min-w-[30px] items-center justify-center rounded-[6px] px-2 text-[12px] font-semibold leading-none bg-[#063B61] text-white shadow-xs dark:bg-[#0879D9]"
                    >
                      {safePage}
                    </button>
                  </>
                )}

                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages)}
                      className={`flex h-[30px] min-w-[30px] items-center justify-center rounded-[6px] px-2 text-[12px] font-semibold leading-none transition cursor-pointer ${
                        safePage === totalPages
                          ? "bg-[#063B61] text-white shadow-xs dark:bg-[#0879D9]"
                          : "border border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F5F9FC] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#8FA8B2] dark:hover:bg-[#18333F]"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] border border-[#CBD5E1] bg-white text-[#475569] shadow-2xs hover:bg-[#F5F9FC] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#8FA8B2] dark:hover:bg-[#18333F] transition cursor-pointer"
                  aria-label={language === "hi" ? "अगला पृष्ठ" : "Next Page"}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              <GoToPage
                currentPage={safePage}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          VIEW TASK QUICK MODAL
      ===================================================== */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        className="w-full max-w-lg"
      >
        {selectedTask && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl dark:border-[#2A4858] dark:bg-[#102A38]">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4 dark:border-[#2A4858]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <ClipboardList size={17} />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold leading-[1.3] text-[#0F172A] dark:text-white">
                    {getTaskTitle(selectedTask)}
                  </h3>
                  <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                    {language === "hi" ? "कार्य विवरण" : (t("taskDetails") || "Task Details")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#063B61] dark:hover:bg-[#18333F] dark:hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                  {t("tasks.taskDescription") || (language === "hi" ? "विवरण" : "Description")}
                </p>
                <p className="mt-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-[13px] font-normal leading-relaxed text-[#334155] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#E5F1F5]">
                  {selectedTask.description || (language === "hi" ? "कोई विवरण उपलब्ध नहीं है।" : "No description provided.")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#2A4858] dark:bg-[#0D2430]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    {t("tasks.status") || (language === "hi" ? "स्थिति" : "Status")}
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={selectedTask.status} />
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#2A4858] dark:bg-[#0D2430]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    {t("tasks.priority") || (language === "hi" ? "प्राथमिकता" : "Priority")}
                  </p>
                  <div className="mt-1">
                    <PriorityBadge priority={selectedTask.priority} />
                  </div>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#2A4858] dark:bg-[#0D2430]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    {t("tasks.assignedTo") || (language === "hi" ? "असाइन किया गया" : "Assigned To")}
                  </p>
                  <p className="mt-1 truncate text-[13px] font-medium leading-[1.4] text-[#0F172A] dark:text-[#E5F1F5]">
                    {getPersonName(selectedTask.assignedTo) || (language === "hi" ? "अवर्गीकृत" : "Unassigned")}
                  </p>
                </div>

                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#2A4858] dark:bg-[#0D2430]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748B] dark:text-[#94A3B8]">
                    {t("tasks.dueDate") || (language === "hi" ? "नियत तिथि" : "Due Date")}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-[1.4] text-[#0F172A] dark:text-[#E5F1F5]">
                    {formatDate(selectedTask.dueDate, language)}
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-6 py-4 bg-[#F8FAFC]/50 dark:border-[#2A4858] dark:bg-[#0D2430]/40">
              <button
                type="button"
                onClick={() => {
                  const id = getTaskId(selectedTask);
                  if (id) {
                    router.push(`/admin/tasks/${id}/edit`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-4 py-2 text-[13px] font-medium leading-[1.2] text-white shadow-xs hover:bg-[#042741] dark:bg-[#0879D9] dark:hover:bg-[#0665B5] transition cursor-pointer"
              >
                <Pencil size={13} />
                <span>{t("tasks.editTask") || (language === "hi" ? "कार्य संपादित करें" : "Edit Task")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium leading-[1.2] text-[#64748B] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#94A3B8] transition cursor-pointer"
              >
                {t("common.close") || (language === "hi" ? "बंद करें" : "Close")}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================
          DELETE TASK CONFIRMATION MODAL
      ===================================================== */}
      <Modal
        isOpen={!!deleteTask}
        onClose={() => !deleting && setDeleteTask(null)}
        className="w-full max-w-sm"
      >
        {deleteTask && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl dark:border-[#2A4858] dark:bg-[#102A38]">
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F1] text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400">
                <Trash2 size={20} />
              </div>

              <h3 className="mt-4 text-[16px] font-semibold leading-[1.3] text-[#0F172A] dark:text-white">
                {language === "hi" ? "कार्य हटाएं?" : "Delete Task?"}
              </h3>

              <p className="mt-2 text-[13px] font-normal leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                {language === "hi" ? "यह कार्रवाई स्थायी रूप से हटा देगी" : "This action will permanently delete"}{" "}
                <span className="font-semibold text-[#0F172A] dark:text-[#E5F1F5]">
                  "{getTaskTitle(deleteTask)}"
                </span>
                . {language === "hi" ? "यह क्रिया पूर्ववत नहीं की जा सकती।" : "This action cannot be undone."}
              </p>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTask(null)}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-[13px] font-medium leading-[1.2] text-[#64748B] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#94A3B8] transition cursor-pointer"
                >
                  {t("common.cancel") || (language === "hi" ? "रद्द करें" : "Cancel")}
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteTask}
                  className="rounded-xl bg-[#E11D48] hover:bg-[#BE123C] px-4 py-2 text-[13px] font-medium leading-[1.2] text-white shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {deleting
                    ? (language === "hi" ? "हटाया जा रहा है..." : "Deleting...")
                    : (language === "hi" ? "कार्य हटाएं" : "Delete Task")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =====================================================
          CUSTOM DATE RANGE MODAL
      ===================================================== */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => {
          setIsCustomDateModalOpen(false);
          if (!customDateRange) {
            setDateFilter("ALL");
          }
        }}
        className="w-full max-w-sm"
      >
        <div className="w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl dark:border-[#2A4858] dark:bg-[#102A38]">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 dark:border-[#2A4858]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                <CalendarDays size={16} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[#0F172A] dark:text-white">
                  {language === "hi" ? "कस्टम तिथि सीमा" : "Custom Date Range"}
                </h3>
                <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                  {language === "hi" ? "नियत तिथि के अनुसार कार्य फ़िल्टर करें" : "Filter tasks by due date"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCustomDateModalOpen(false);
                if (!customDateRange) {
                  setDateFilter("ALL");
                }
              }}
              className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#063B61] dark:hover:bg-[#18333F] dark:hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-[#475569] dark:text-[#CBD5E1] mb-1">
                {language === "hi" ? "प्रारंभिक तिथि" : "From Date"}
              </label>
              <input
                type="date"
                value={tempFromDate}
                onChange={(e) => {
                  setTempFromDate(e.target.value);
                  if (tempToDate && e.target.value > tempToDate) {
                    setCustomDateError(language === "hi" ? "अंतिम तिथि प्रारंभिक तिथि के बाद या बराबर होनी चाहिए।" : "To date must be after or equal to From date.");
                  } else {
                    setCustomDateError("");
                  }
                }}
                className="h-[38px] w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] font-normal text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#E5F1F5]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#475569] dark:text-[#CBD5E1] mb-1">
                {language === "hi" ? "अंतिम तिथि" : "To Date"}
              </label>
              <input
                type="date"
                value={tempToDate}
                onChange={(e) => {
                  setTempToDate(e.target.value);
                  if (tempFromDate && e.target.value < tempFromDate) {
                    setCustomDateError(language === "hi" ? "अंतिम तिथि प्रारंभिक तिथि के बाद या बराबर होनी चाहिए।" : "To date must be after or equal to From date.");
                  } else {
                    setCustomDateError("");
                  }
                }}
                className="h-[38px] w-full rounded-xl border border-[#CBD5E1] bg-white px-3 text-[13px] font-normal text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#E5F1F5]"
              />
            </div>

            {customDateError && (
              <div className="flex items-center gap-2 rounded-lg bg-[#FEF2F2] p-2.5 text-xs font-semibold text-[#E11D48] dark:bg-rose-950/40 dark:text-rose-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>{customDateError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-3 bg-[#F8FAFC] dark:border-[#2A4858] dark:bg-[#0D2430]/40">
            <button
              type="button"
              onClick={() => {
                setCustomDateRange(null);
                setDateFilter("ALL");
                setTempFromDate("");
                setTempToDate("");
                setCustomDateError("");
                setIsCustomDateModalOpen(false);
              }}
              className="text-[12px] font-medium text-[#64748B] hover:text-[#00A6C7] dark:text-[#8FA8B2] dark:hover:text-[#4CD2DA] transition cursor-pointer"
            >
              {language === "hi" ? "सभी तिथियां रीसेट करें" : "Reset All Dates"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomDateModalOpen(false);
                  if (!customDateRange) {
                    setDateFilter("ALL");
                  }
                }}
                className="rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#64748B] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-[#94A3B8] transition cursor-pointer"
              >
                {t("common.cancel") || (language === "hi" ? "रद्द करें" : "Cancel")}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!tempFromDate || !tempToDate) {
                    setCustomDateError(language === "hi" ? "कृपया दोनों प्रारंभिक और अंतिम तिथियां चुनें।" : "Please select both From and To dates.");
                    return;
                  }
                  if (tempToDate < tempFromDate) {
                    setCustomDateError(language === "hi" ? "अंतिम तिथि प्रारंभिक तिथि के बाद या बराबर होनी चाहिए।" : "To date must be after or equal to From date.");
                    return;
                  }

                  setCustomDateRange({ from: tempFromDate, to: tempToDate });
                  setDateFilter("CUSTOM");
                  setCustomDateError("");
                  setIsCustomDateModalOpen(false);
                }}
                className="rounded-xl bg-[#063B61] hover:bg-[#032F4D] px-4 py-1.5 text-[13px] font-semibold text-white shadow-xs transition cursor-pointer dark:bg-[#0879D9]"
              >
                {language === "hi" ? "सीमा लागू करें" : "Apply Range"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}

export default function AdminTasksPage() {
  return (
    <Suspense fallback={null}>
      <AdminTasksContent />
    </Suspense>
  );
}