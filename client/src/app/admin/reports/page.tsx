"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Clock3,
  Download,
  Filter,
  Layers,
  ListTodo,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { useDepartments } from "@/hooks/useDepartments";
import { Modal } from "@/components/ui/Modal";

// =====================================================
// TYPES
// =====================================================

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type DateRangeOption =
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "THIS_WEEK"
  | "LAST_WEEK"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "LAST_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM"
  | "ALL_TIME";

interface Employee {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  department?: string;
  designation?: string;
  employeeId?: string;
}

interface Task {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  assignedTo?: Employee | string | null;
  createdBy?: Employee | string | null;
}

interface TaskResponse {
  success?: boolean;
  message?: string;
  data?:
    | Task[]
    | {
        tasks?: Task[];
      };
  tasks?: Task[];
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

interface ReportFilters {
  dateRange: DateRangeOption;
  customFrom: string;
  customTo: string;
  status: "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  priority: "ALL" | TaskPriority;
  employeeId: "ALL" | string;
  department: "ALL" | string;
  search: string;
}

// =====================================================
// HELPERS
// =====================================================

function normalizeStatus(status?: string): TaskStatus {
  const value = String(status || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (value === "COMPLETED") return "COMPLETED";
  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function normalizePriority(priority?: string): TaskPriority {
  const value = String(priority || "MEDIUM")
    .trim()
    .toUpperCase();

  if (value === "LOW") return "LOW";
  if (value === "HIGH") return "HIGH";
  if (value === "URGENT") return "URGENT";
  return "MEDIUM";
}

function getEmployeeId(employee: Employee | string | null | undefined): string {
  if (!employee) return "";
  if (typeof employee === "string") return employee;
  return String(employee._id || employee.id || "");
}

function getEmployeeName(employee: Employee | string | null | undefined, unassignedLabel = "Unassigned", defaultLabel = "Employee"): string {
  if (!employee) return unassignedLabel;
  if (typeof employee === "string") return defaultLabel;

  const fullName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
  return fullName || employee.name || employee.email || defaultLabel;
}

function getEmployeeInitials(name: string): string {
  if (!name || name === "Unassigned") return "UN";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(date?: string | Date, language = "en"): string {
  if (!date) return language === "hi" ? "कोई तिथि नहीं" : "No date";
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return language === "hi" ? "कोई तिथि नहीं" : "No date";

  return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || normalizeStatus(task.status) === "COMPLETED") {
    return false;
  }
  const dueTime = new Date(task.dueDate).getTime();
  return !Number.isNaN(dueTime) && dueTime < Date.now();
}

// =====================================================
// DATE RANGE CALCULATION ENGINE
// =====================================================

function getDateRangeOptionLabel(option: DateRangeOption, t?: (k: string) => string): string {
  if (!t) {
    const fallback: Record<DateRangeOption, string> = {
      TODAY: "Today",
      YESTERDAY: "Yesterday",
      LAST_7_DAYS: "Last 7 Days",
      THIS_WEEK: "This Week",
      LAST_WEEK: "Last Week",
      LAST_30_DAYS: "Last 30 Days",
      THIS_MONTH: "This Month",
      LAST_MONTH: "Last Month",
      THIS_QUARTER: "This Quarter",
      LAST_QUARTER: "Last Quarter",
      THIS_YEAR: "This Year",
      ALL_TIME: "All Time",
      CUSTOM: "Custom Range",
    };
    return fallback[option] || option;
  }

  switch (option) {
    case "TODAY": return t("reports.today") || "Today";
    case "YESTERDAY": return t("reports.yesterday") || "Yesterday";
    case "LAST_7_DAYS": return t("reports.last7Days") || "Last 7 Days";
    case "THIS_WEEK": return t("reports.thisWeek") || "This Week";
    case "LAST_WEEK": return t("reports.lastWeek") || "Last Week";
    case "LAST_30_DAYS": return t("reports.last30Days") || "Last 30 Days";
    case "THIS_MONTH": return t("reports.thisMonth") || "This Month";
    case "LAST_MONTH": return t("reports.lastMonth") || "Last Month";
    case "THIS_QUARTER": return t("reports.thisQuarter") || "This Quarter";
    case "LAST_QUARTER": return t("reports.lastQuarter") || "Last Quarter";
    case "THIS_YEAR": return t("reports.thisYear") || "This Year";
    case "ALL_TIME": return t("reports.allTime") || "All Time";
    case "CUSTOM": return t("reports.custom") || "Custom Range";
    default: return option;
  }
}

function getDateRangeBounds(
  option: DateRangeOption,
  customFrom?: string,
  customTo?: string,
  t?: (k: string) => string,
  language = "en"
): {
  start: Date;
  end: Date;
  label: string;
  hasBounds: boolean;
  prevStart: Date;
  prevEnd: Date;
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const date = now.getDate();

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (option) {
    case "TODAY": {
      const s = startOfDay(now);
      const e = endOfDay(now);
      const ps = new Date(s);
      ps.setDate(ps.getDate() - 1);
      const pe = new Date(e);
      pe.setDate(pe.getDate() - 1);
      return { start: s, end: e, label: getDateRangeOptionLabel("TODAY", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "YESTERDAY": {
      const y = new Date(year, month, date - 1);
      const s = startOfDay(y);
      const e = endOfDay(y);
      const ps = new Date(s);
      ps.setDate(ps.getDate() - 1);
      const pe = new Date(e);
      pe.setDate(pe.getDate() - 1);
      return { start: s, end: e, label: getDateRangeOptionLabel("YESTERDAY", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "LAST_7_DAYS": {
      const s = startOfDay(new Date(year, month, date - 6));
      const e = endOfDay(now);
      const ps = startOfDay(new Date(year, month, date - 13));
      const pe = endOfDay(new Date(year, month, date - 7));
      return { start: s, end: e, label: getDateRangeOptionLabel("LAST_7_DAYS", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "THIS_WEEK": {
      const day = now.getDay();
      const diff = date - day + (day === 0 ? -6 : 1); // Monday
      const s = startOfDay(new Date(year, month, diff));
      const e = endOfDay(new Date(year, month, diff + 6));
      const ps = startOfDay(new Date(year, month, diff - 7));
      const pe = endOfDay(new Date(year, month, diff - 1));
      return { start: s, end: e, label: getDateRangeOptionLabel("THIS_WEEK", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "LAST_WEEK": {
      const day = now.getDay();
      const diff = date - day + (day === 0 ? -6 : 1);
      const s = startOfDay(new Date(year, month, diff - 7));
      const e = endOfDay(new Date(year, month, diff - 1));
      const ps = startOfDay(new Date(year, month, diff - 14));
      const pe = endOfDay(new Date(year, month, diff - 8));
      return { start: s, end: e, label: getDateRangeOptionLabel("LAST_WEEK", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "LAST_30_DAYS": {
      const s = startOfDay(new Date(year, month, date - 29));
      const e = endOfDay(now);
      const ps = startOfDay(new Date(year, month, date - 59));
      const pe = endOfDay(new Date(year, month, date - 30));
      return { start: s, end: e, label: getDateRangeOptionLabel("LAST_30_DAYS", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "THIS_MONTH": {
      const s = startOfDay(new Date(year, month, 1));
      const e = endOfDay(new Date(year, month + 1, 0));
      const ps = startOfDay(new Date(year, month - 1, 1));
      const pe = endOfDay(new Date(year, month, 0));
      return { start: s, end: e, label: getDateRangeOptionLabel("THIS_MONTH", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "LAST_MONTH": {
      const s = startOfDay(new Date(year, month - 1, 1));
      const e = endOfDay(new Date(year, month, 0));
      const ps = startOfDay(new Date(year, month - 2, 1));
      const pe = endOfDay(new Date(year, month - 1, 0));
      return { start: s, end: e, label: getDateRangeOptionLabel("LAST_MONTH", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "THIS_QUARTER": {
      const q = Math.floor(month / 3);
      const s = startOfDay(new Date(year, q * 3, 1));
      const e = endOfDay(new Date(year, (q + 1) * 3, 0));
      const ps = startOfDay(new Date(year, (q - 1) * 3, 1));
      const pe = endOfDay(new Date(year, q * 3, 0));
      return { start: s, end: e, label: getDateRangeOptionLabel("THIS_QUARTER", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "LAST_QUARTER": {
      const q = Math.floor(month / 3) - 1;
      const s = startOfDay(new Date(year, q * 3, 1));
      const e = endOfDay(new Date(year, (q + 1) * 3, 0));
      const ps = startOfDay(new Date(year, (q - 1) * 3, 1));
      const pe = endOfDay(new Date(year, q * 3, 0));
      return { start: s, end: e, label: getDateRangeOptionLabel("LAST_QUARTER", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "THIS_YEAR": {
      const s = startOfDay(new Date(year, 0, 1));
      const e = endOfDay(new Date(year, 11, 31));
      const ps = startOfDay(new Date(year - 1, 0, 1));
      const pe = endOfDay(new Date(year - 1, 11, 31));
      return { start: s, end: e, label: getDateRangeOptionLabel("THIS_YEAR", t), hasBounds: true, prevStart: ps, prevEnd: pe };
    }
    case "CUSTOM": {
      if (customFrom && customTo) {
        const [fY, fM, fD] = customFrom.split("-").map(Number);
        const [tY, tM, tD] = customTo.split("-").map(Number);
        const s = startOfDay(new Date(fY, fM - 1, fD));
        const e = endOfDay(new Date(tY, tM - 1, tD));
        const diffMs = e.getTime() - s.getTime();
        const ps = new Date(s.getTime() - diffMs);
        const pe = new Date(s.getTime() - 1);
        const sLabel = s.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", { month: "short", day: "2-digit" });
        const eLabel = e.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", { month: "short", day: "2-digit", year: "numeric" });
        return { start: s, end: e, label: `${sLabel} – ${eLabel}`, hasBounds: true, prevStart: ps, prevEnd: pe };
      }
      return {
        start: new Date(2000, 0, 1),
        end: new Date(2099, 11, 31),
        label: getDateRangeOptionLabel("CUSTOM", t),
        hasBounds: false,
        prevStart: new Date(1990, 0, 1),
        prevEnd: new Date(1999, 11, 31),
      };
    }
    case "ALL_TIME":
    default: {
      return {
        start: new Date(2000, 0, 1),
        end: new Date(2099, 11, 31),
        label: getDateRangeOptionLabel("ALL_TIME", t),
        hasBounds: false,
        prevStart: new Date(1990, 0, 1),
        prevEnd: new Date(1999, 11, 31),
      };
    }
  }
}

// =====================================================
// SVG DONUT CHART (FULLY DYNAMIC WITH FLOATING TOOLTIP)
// =====================================================

function DynamicDonutChart({
  segments,
  total,
  centerTotalLabel = "TOTAL TASKS",
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  centerTotalLabel?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const activeSeg = hoveredIndex !== null ? segments[hoveredIndex] : null;
  const activePercent =
    total > 0 && activeSeg
      ? ((activeSeg.value / total) * 100).toFixed(1)
      : "0";

  return (
    <div className="relative flex h-[195px] w-[195px] shrink-0 items-center justify-center">
      {/* Floating Tooltip */}
      {activeSeg && (
        <div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-xl border border-[#D8E4EC] bg-[#06283D] px-3 py-1 text-xs text-white shadow-xl dark:border-[#28495A] dark:bg-[#071F2C]">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: activeSeg.color }}
            />
            <span className="font-bold">{activeSeg.label}:</span>
            <span className="font-bold text-[#8EE4EF]">{activeSeg.value}</span>
            <span className="text-[11px] text-white/70">({activePercent}%)</span>
          </div>
        </div>
      )}

      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90 overflow-visible">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#EAF1F5"
          strokeWidth="20"
          className="dark:stroke-[#163548]"
        />
        {segments.map((segment, idx) => {
          const isHovered = hoveredIndex === idx;
          const length = total > 0 ? (segment.value / total) * circumference : 0;
          const currentOffset = offset;
          offset += length;

          return length > 0 ? (
            <circle
              key={segment.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={isHovered ? 24 : 20}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-200"
              style={{
                filter: isHovered
                  ? "drop-shadow(0px 0px 6px rgba(0,0,0,0.25)) brightness(1.1)"
                  : hoveredIndex !== null
                  ? "opacity(0.6)"
                  : "none",
              }}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ) : null;
        })}
      </svg>

      {/* Center dynamic metric */}
      <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
        {activeSeg ? (
          <>
            <span className="text-[28px] font-bold leading-none tracking-tight text-[#063B61] dark:text-white">
              {activeSeg.value}
            </span>
            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#6B879B] dark:text-[#8CB0C7]">
              {activeSeg.label}
            </span>
            <span className="text-[11px] font-bold text-[#00A6C7]">
              {activePercent}%
            </span>
          </>
        ) : (
          <>
            <span className="text-[32px] font-extrabold leading-none tracking-tight text-[#063B61] dark:text-white">
              {total}
            </span>
            <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.16em] text-[#6B879B] dark:text-[#8CB0C7]">
              {centerTotalLabel}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================
// DYNAMIC GROUPED BAR CHART
// =====================================================

function DynamicActivityBarChart({
  data,
  emptyMessage = "No activity recorded in this period.",
  createdLabel = "Created",
  completedLabel = "Completed",
}: {
  data: { label: string; created: number; completed: number }[];
  emptyMessage?: string;
  createdLabel?: string;
  completedLabel?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-xs font-semibold text-[#8497A1] dark:text-[#8FA8B2]">
        {emptyMessage}
      </div>
    );
  }

  // Calculate clean Y ticks
  const maxDataVal = Math.max(1, ...data.flatMap((d) => [d.created, d.completed]));
  const maxValue = Math.max(5, Math.ceil(maxDataVal / 5) * 5);
  const yTicks = [maxValue, Math.round(maxValue * 0.66), Math.round(maxValue * 0.33), 0];

  return (
    <div className="w-full">
      <div className="relative h-[240px] w-full pl-7 sm:pl-9 pr-2 pt-4">
        {/* Y-axis Labels */}
        <div className="pointer-events-none absolute bottom-[38px] left-0 top-4 flex w-6 sm:w-7 flex-col justify-between text-right text-[10.5px] font-medium text-[#6B879B] dark:text-[#8CB0C7]">
          {yTicks.map((tick, i) => (
            <span key={i} className="leading-none">
              {tick}
            </span>
          ))}
        </div>

        {/* Gridlines */}
        <div className="pointer-events-none absolute bottom-[38px] left-7 sm:left-9 right-2 top-4 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="border-t border-[#EDF3F7] dark:border-[#1A3D56]" />
          ))}
        </div>

        {/* Bars Container */}
        <div className="absolute bottom-[38px] left-7 sm:left-9 right-2 top-4 flex items-end justify-between px-1 sm:px-3">
          {data.map((item, idx) => {
            const isHovered = hoveredIdx === idx;

            const createdHeight = Math.max(
              item.created > 0 ? 8 : 2,
              Math.round((item.created / maxValue) * 155)
            );

            const completedHeight = Math.max(
              item.completed > 0 ? 8 : 2,
              Math.round((item.completed / maxValue) * 155)
            );

            return (
              <div
                key={`${item.label}-${idx}`}
                className={`group relative flex h-full flex-1 flex-col items-center justify-end rounded-xl transition-colors duration-150 ${
                  isHovered
                    ? "bg-[#EAF5FC]/50 dark:bg-[#123142]/40"
                    : "hover:bg-[#F4F9FD]/40 dark:hover:bg-[#0D2430]/30"
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="pointer-events-none absolute -top-12 z-30 flex flex-col items-start whitespace-nowrap rounded-xl border border-[#D8E4EC] bg-[#06283D] px-3.5 py-1.5 text-white shadow-xl dark:border-[#28495A] dark:bg-[#071F2C]">
                    <span className="text-[11px] font-bold text-[#A8C5D3]">{item.label}</span>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium text-[#7DD3FC]">
                        <span className="h-2 w-2 rounded-full bg-[#0879D9]" />
                        {createdLabel}: <b className="font-bold text-white">{item.created}</b>
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-[#5EEAD4]">
                        <span className="h-2 w-2 rounded-full bg-[#00A878]" />
                        {completedLabel}: <b className="font-bold text-white">{item.completed}</b>
                      </span>
                    </div>
                  </div>
                )}

                {/* Grouped Bars */}
                <div className="flex items-end justify-center gap-1 sm:gap-1.5 pb-1">
                  {/* Created */}
                  <div
                    className="w-3 sm:w-5 lg:w-6 rounded-t-sm bg-[#0879D9] transition-all duration-300"
                    style={{
                      height: `${createdHeight}px`,
                      filter: isHovered ? "brightness(1.1)" : "none",
                    }}
                  />
                  {/* Completed */}
                  <div
                    className="w-3 sm:w-5 lg:w-6 rounded-t-sm bg-[#00A878] transition-all duration-300"
                    style={{
                      height: `${completedHeight}px`,
                      filter: isHovered ? "brightness(1.1)" : "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-axis Labels */}
        <div className="absolute bottom-1 left-7 sm:left-9 right-2 flex justify-between px-1 sm:px-3 text-center">
          {data.map((item, idx) => {
            // If more than 14 bars, show fewer labels to avoid overcrowding
            const showLabel = data.length <= 14 || idx % Math.ceil(data.length / 10) === 0 || idx === data.length - 1;

            return (
              <span
                key={`${item.label}-${idx}`}
                className={`flex-1 text-[10px] sm:text-[11px] font-semibold transition-colors truncate ${
                  hoveredIdx === idx
                    ? "text-[#063B61] dark:text-white"
                    : "text-[#6B879B] dark:text-[#8CB0C7]"
                }`}
              >
                {showLabel ? item.label : ""}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN REPORTS COMPONENT
// =====================================================

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Raw data state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });

  // Central Reporting Filter State
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "LAST_7_DAYS",
    customFrom: "",
    customTo: "",
    status: "ALL",
    priority: "ALL",
    employeeId: "ALL",
    department: "ALL",
    search: "",
  });

  // Custom date range modal
  const [isCustomDateModalOpen, setIsCustomDateModalOpen] = useState(false);
  const [modalFrom, setModalFrom] = useState("");
  const [modalTo, setModalTo] = useState("");
  const [customModalError, setCustomModalError] = useState("");

  // ===================================================
  // FETCH RAW DATA FROM APPLICATION API
  // ===================================================

  const loadRawData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [taskRes, empRes] = await Promise.all([
        apiRequest<TaskResponse>("/api/tasks?limit=100", { method: "GET" }),
        apiRequest<EmployeeResponse>("/api/users/employees", { method: "GET" }),
      ]);

      let taskList: Task[] = [];
      if (Array.isArray(taskRes?.data)) {
        taskList = taskRes.data;
      } else if (taskRes?.data && typeof taskRes.data === "object" && Array.isArray(taskRes.data.tasks)) {
        taskList = taskRes.data.tasks;
      } else if (Array.isArray(taskRes?.tasks)) {
        taskList = taskRes.tasks;
      }

      let employeeList: Employee[] = [];
      if (Array.isArray(empRes?.data)) {
        employeeList = empRes.data;
      } else if (empRes?.data && typeof empRes.data === "object" && Array.isArray(empRes.data.employees)) {
        employeeList = empRes.data.employees;
      }

      setTasks(taskList);
      setEmployees(employeeList);
    } catch (err: any) {
      console.error("[ADMIN REPORTS] Load error:", err);
      setError(err?.message || "Unable to load reports from database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRawData();
  }, []);

  // Sync URL search params if present
  useEffect(() => {
    const statusParam = searchParams.get("status") || searchParams.get("status_text");
    if (statusParam) {
      const upper = statusParam.toUpperCase();
      if (["PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"].includes(upper)) {
        setFilters((prev) => ({ ...prev, status: upper as any }));
      }
    }
  }, [searchParams]);

  // Distinct departments extracted dynamically from master data + employee list
  const departments = useMemo(() => {
    const set = new Set<string>(masterDeptNames);
    employees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        set.add(emp.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [employees, masterDeptNames]);

  // Employee mapping lookup
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((emp) => {
      const id = getEmployeeId(emp);
      if (id) map.set(id, emp);
    });
    return map;
  }, [employees]);

  // Date range bounds & comparison bounds
  const rangeBounds = useMemo(() => {
    return getDateRangeBounds(filters.dateRange, filters.customFrom, filters.customTo, t, language);
  }, [filters.dateRange, filters.customFrom, filters.customTo, t, language]);

  // ===================================================
  // CENTRAL FILTERED TASKS DATASET (Single Source of Truth)
  // ===================================================

  const filteredTasks = useMemo(() => {
    const { start, end, hasBounds } = rangeBounds;
    const query = filters.search.trim().toLowerCase();

    return tasks.filter((task) => {
      // 1. DATE RANGE CHECK
      if (hasBounds) {
        const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : 0;
        const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : 0;
        const compTime = task.completedAt
          ? new Date(task.completedAt).getTime()
          : normalizeStatus(task.status) === "COMPLETED" && task.updatedAt
          ? new Date(task.updatedAt).getTime()
          : 0;

        const inCreated = createdTime >= start.getTime() && createdTime <= end.getTime();
        const inDue = dueTime >= start.getTime() && dueTime <= end.getTime();
        const inCompleted = compTime >= start.getTime() && compTime <= end.getTime();

        if (!inCreated && !inDue && !inCompleted) {
          return false;
        }
      }

      // 2. STATUS CHECK
      const normStatus = normalizeStatus(task.status);
      if (filters.status === "OVERDUE") {
        if (!isOverdue(task)) return false;
      } else if (filters.status !== "ALL") {
        if (normStatus !== filters.status) return false;
      }

      // 3. PRIORITY CHECK
      if (filters.priority !== "ALL") {
        if (normalizePriority(task.priority) !== filters.priority) return false;
      }

      // 4. EMPLOYEE CHECK
      if (filters.employeeId !== "ALL") {
        if (getEmployeeId(task.assignedTo) !== filters.employeeId) return false;
      }

      // 5. DEPARTMENT CHECK
      if (filters.department !== "ALL") {
        let empDept = "";
        if (task.assignedTo && typeof task.assignedTo === "object") {
          empDept = task.assignedTo.department || "";
        } else {
          const emp = employeeMap.get(getEmployeeId(task.assignedTo));
          empDept = emp?.department || "";
        }
        if (empDept.trim().toLowerCase() !== filters.department.trim().toLowerCase()) {
          return false;
        }
      }

      // 6. SEARCH QUERY
      if (query) {
        const title = (task.title || "").toLowerCase();
        const desc = (task.description || "").toLowerCase();
        const empName = getEmployeeName(task.assignedTo).toLowerCase();
        if (!title.includes(query) && !desc.includes(query) && !empName.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, rangeBounds, filters, employeeMap]);

  // Prior period tasks for historical comparison calculation
  const priorPeriodTasks = useMemo(() => {
    const { prevStart, prevEnd, hasBounds } = rangeBounds;
    if (!hasBounds) return [];

    return tasks.filter((task) => {
      const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : 0;
      const dueTime = task.dueDate ? new Date(task.dueDate).getTime() : 0;
      const compTime = task.completedAt
        ? new Date(task.completedAt).getTime()
        : normalizeStatus(task.status) === "COMPLETED" && task.updatedAt
        ? new Date(task.updatedAt).getTime()
        : 0;

      return (
        (createdTime >= prevStart.getTime() && createdTime <= prevEnd.getTime()) ||
        (dueTime >= prevStart.getTime() && dueTime <= prevEnd.getTime()) ||
        (compTime >= prevStart.getTime() && compTime <= prevEnd.getTime())
      );
    });
  }, [tasks, rangeBounds]);

  // ===================================================
  // DERIVED REPORT METRICS
  // ===================================================

  const metrics = useMemo(() => {
    const total = filteredTasks.length;
    const pending = filteredTasks.filter((t) => normalizeStatus(t.status) === "PENDING").length;
    const inProgress = filteredTasks.filter((t) => normalizeStatus(t.status) === "IN_PROGRESS").length;
    const completed = filteredTasks.filter((t) => normalizeStatus(t.status) === "COMPLETED").length;
    const overdue = filteredTasks.filter(isOverdue).length;

    const remaining = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const overdueRate = total > 0 ? Math.round((overdue / total) * 100) : 0;

    // Prior period delta
    const priorTotal = priorPeriodTasks.length;
    let periodDelta: { value: number; isUp: boolean } | null = null;
    if (rangeBounds.hasBounds && priorTotal > 0) {
      const delta = Math.round(((total - priorTotal) / priorTotal) * 100);
      periodDelta = { value: Math.abs(delta), isUp: delta >= 0 };
    }

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      remaining,
      completionRate,
      overdueRate,
      periodDelta,
    };
  }, [filteredTasks, priorPeriodTasks, rangeBounds]);

  // ===================================================
  // PRIORITY DISTRIBUTION DERIVATION
  // ===================================================

  const priorityDistribution = useMemo(() => {
    const counts = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredTasks.forEach((t) => {
      const p = normalizePriority(t.priority);
      counts[p] += 1;
    });

    const total = filteredTasks.length;
    return [
      {
        key: "URGENT",
        label: t("priority.URGENT") || "Urgent",
        count: counts.URGENT,
        percent: total > 0 ? ((counts.URGENT / total) * 100).toFixed(1) : "0.0",
        color: "#E5484D",
        bgClass: "bg-[#E5484D]",
      },
      {
        key: "HIGH",
        label: t("priority.HIGH") || "High",
        count: counts.HIGH,
        percent: total > 0 ? ((counts.HIGH / total) * 100).toFixed(1) : "0.0",
        color: "#EA580C",
        bgClass: "bg-[#EA580C]",
      },
      {
        key: "MEDIUM",
        label: t("priority.MEDIUM") || "Medium",
        count: counts.MEDIUM,
        percent: total > 0 ? ((counts.MEDIUM / total) * 100).toFixed(1) : "0.0",
        color: "#0879D9",
        bgClass: "bg-[#0879D9]",
      },
      {
        key: "LOW",
        label: t("priority.LOW") || "Low",
        count: counts.LOW,
        percent: total > 0 ? ((counts.LOW / total) * 100).toFixed(1) : "0.0",
        color: "#6B879B",
        bgClass: "bg-[#6B879B]",
      },
    ];
  }, [filteredTasks, t]);

  // ===================================================
  // EMPLOYEE WORKLOAD DERIVATION
  // ===================================================

  const employeeWorkload = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        department: string;
        total: number;
        completed: number;
      }
    >();

    filteredTasks.forEach((task) => {
      const emp = task.assignedTo;
      const id = getEmployeeId(emp) || "unassigned";
      const name = getEmployeeName(emp, t("reports.employee") || "Unassigned", t("reports.employee") || "Employee");
      const dept =
        emp && typeof emp === "object"
          ? emp.department || "General"
          : employeeMap.get(id)?.department || (id === "unassigned" ? "—" : "General");

      if (!map.has(id)) {
        map.set(id, { id, name, department: dept, total: 0, completed: 0 });
      }

      const entry = map.get(id)!;
      entry.total += 1;
      if (normalizeStatus(task.status) === "COMPLETED") {
        entry.completed += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredTasks, employeeMap, t]);

  // ===================================================
  // DYNAMIC ACTIVITY TIMELINE BUCKETING
  // ===================================================

  const activityTrend = useMemo(() => {
    const { start, end, hasBounds } = rangeBounds;
    const range = filters.dateRange;

    // Helper: format YYYY-MM-DD
    const toIsoKey = (d: Date) => d.toISOString().slice(0, 10);

    // 1. TODAY / YESTERDAY (Hourly buckets: 4-hour blocks)
    if (range === "TODAY" || range === "YESTERDAY") {
      const buckets: { label: string; created: number; completed: number }[] = [
        { label: "00:00", created: 0, completed: 0 },
        { label: "04:00", created: 0, completed: 0 },
        { label: "08:00", created: 0, completed: 0 },
        { label: "12:00", created: 0, completed: 0 },
        { label: "16:00", created: 0, completed: 0 },
        { label: "20:00", created: 0, completed: 0 },
      ];

      filteredTasks.forEach((task) => {
        if (task.createdAt) {
          const cDate = new Date(task.createdAt);
          if (cDate >= start && cDate <= end) {
            const h = cDate.getHours();
            const bIdx = Math.min(Math.floor(h / 4), 5);
            buckets[bIdx].created += 1;
          }
        }
        if (normalizeStatus(task.status) === "COMPLETED") {
          const compDate = task.completedAt
            ? new Date(task.completedAt)
            : task.updatedAt
            ? new Date(task.updatedAt)
            : null;
          if (compDate && compDate >= start && compDate <= end) {
            const h = compDate.getHours();
            const bIdx = Math.min(Math.floor(h / 4), 5);
            buckets[bIdx].completed += 1;
          }
        }
      });

      return buckets;
    }

    // 2. YEARLY (12 Months)
    if (range === "THIS_YEAR") {
      const monthNames = language === "hi"
        ? ["जन", "फर", "मार्च", "अप्रै", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"]
        : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const buckets = monthNames.map((m) => ({ label: m, created: 0, completed: 0 }));

      filteredTasks.forEach((task) => {
        if (task.createdAt) {
          const c = new Date(task.createdAt);
          if (c.getFullYear() === start.getFullYear()) {
            buckets[c.getMonth()].created += 1;
          }
        }
        if (normalizeStatus(task.status) === "COMPLETED") {
          const comp = task.completedAt
            ? new Date(task.completedAt)
            : task.updatedAt
            ? new Date(task.updatedAt)
            : null;
          if (comp && comp.getFullYear() === start.getFullYear()) {
            buckets[comp.getMonth()].completed += 1;
          }
        }
      });

      return buckets;
    }

    // 3. DAILY BUCKETS (Default for Last 7 Days, This Week, Last Week, Last 30 Days, This Month, etc.)
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysCount = hasBounds ? Math.min(diffDays, 31) : 7;

    const buckets: {
      dateKey: string;
      label: string;
      created: number;
      completed: number;
    }[] = [];

    for (let i = 0; i < daysCount; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);

      const key = toIsoKey(cur);
      const label = cur.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
        month: "short",
        day: "2-digit",
      });

      buckets.push({ dateKey: key, label, created: 0, completed: 0 });
    }

    const keyMap = new Map<string, number>();
    buckets.forEach((b, idx) => keyMap.set(b.dateKey, idx));

    filteredTasks.forEach((task) => {
      if (task.createdAt) {
        const cKey = toIsoKey(new Date(task.createdAt));
        const idx = keyMap.get(cKey);
        if (idx !== undefined) {
          buckets[idx].created += 1;
        }
      }

      if (normalizeStatus(task.status) === "COMPLETED") {
        const compDate = task.completedAt
          ? new Date(task.completedAt)
          : task.updatedAt
          ? new Date(task.updatedAt)
          : null;

        if (compDate) {
          const k = toIsoKey(compDate);
          const idx = keyMap.get(k);
          if (idx !== undefined) {
            buckets[idx].completed += 1;
          }
        }
      }
    });

    return buckets.map(({ label, created, completed }) => ({ label, created, completed }));
  }, [rangeBounds, filters.dateRange, filteredTasks, language]);

  // Check if any filters are engaged
  const hasActiveFilters =
    filters.dateRange !== "LAST_7_DAYS" ||
    filters.status !== "ALL" ||
    filters.priority !== "ALL" ||
    filters.employeeId !== "ALL" ||
    filters.department !== "ALL" ||
    Boolean(filters.search);

  const clearAllFilters = () => {
    setFilters({
      dateRange: "LAST_7_DAYS",
      customFrom: "",
      customTo: "",
      status: "ALL",
      priority: "ALL",
      employeeId: "ALL",
      department: "ALL",
      search: "",
    });
  };

  // CSV Export for Requirement #36
  const handleExportCSV = () => {
    if (filteredTasks.length === 0) {
      showToast.warning(t("reports.noTasksToExport") || "No tasks available to export for the selected filters.");
      return;
    }

    const headers = ["Task ID", "Title", "Status", "Priority", "Due Date", "Created At", "Assigned To", "Department"];
    const rows = filteredTasks.map((t) => [
      t._id || t.id || "",
      `"${(t.title || "").replace(/"/g, '""')}"`,
      normalizeStatus(t.status),
      normalizePriority(t.priority),
      t.dueDate ? t.dueDate.slice(0, 10) : "",
      t.createdAt ? t.createdAt.slice(0, 10) : "",
      `"${getEmployeeName(t.assignedTo).replace(/"/g, '""')}"`,
      `"${(t.assignedTo && typeof t.assignedTo === "object" ? t.assignedTo.department || "" : "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `task-report-${rangeBounds.label.replace(/[^a-zA-Z0-9]/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast.success(t("reports.exportSuccess") || "Report CSV exported successfully.");
  };

  // ===================================================
  // LOADING SKELETON
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071F2C] px-4 py-6 sm:px-8 sm:py-8 lg:px-9">
        <div className="mx-auto max-w-[1340px] animate-pulse space-y-6">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-8 w-44 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-10 w-36 rounded-xl bg-slate-200 dark:bg-slate-700" />
          </div>

          <div className="h-16 rounded-xl border border-[#D8E4EC] bg-white dark:border-[#1E435E] dark:bg-[#0B2538]" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-[#D8E4EC] dark:border-[#1E435E] dark:bg-[#0B2538]" />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="h-72 rounded-2xl bg-white border border-[#D8E4EC] dark:border-[#1E435E] dark:bg-[#0B2538]" />
            <div className="h-72 rounded-2xl bg-white border border-[#D8E4EC] dark:border-[#1E435E] dark:bg-[#0B2538]" />
          </div>

          <div className="h-80 rounded-2xl bg-white border border-[#D8E4EC] dark:border-[#1E435E] dark:bg-[#0B2538]" />
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error && tasks.length === 0) {
    return (
      <main className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-[#F5F9FC] dark:bg-[#071F2C] p-6">
        <div className="w-full max-w-md rounded-2xl border border-[#D8E4EC] bg-white p-8 text-center shadow-lg dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-[#E5484D] dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={22} />
          </div>
          <h2 className="mt-4 text-base font-bold text-[#063B61] dark:text-white">
            {t("reportsUnavailable") || "Reports Unavailable"}
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#6B879B] dark:text-[#8CB0C7]">{error}</p>
          <button
            type="button"
            onClick={() => loadRawData()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
          >
            <RefreshCw size={13} />
            <span>{t("tryAgain") || "Retry"}</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 text-[#063B61] dark:bg-[#071F2C] dark:text-[#E5F1F5]">
      {/* BACKGROUND PATTERN */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#D7E7EC 1px, transparent 1px), linear-gradient(90deg, #D7E7EC 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto max-w-[1340px] space-y-6">
        {/* =================================================
            1. PAGE HEADER & EXPORT / REFRESH CONTROLS
        ================================================= */}
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#00A6C7]/30 bg-[#EAF5FC] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:border-[#00A6C7]/40 dark:bg-[#0B2E42] dark:text-[#4CD2DA]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#087D8F] dark:bg-[#4CD2DA]" />
              <span>{t("reports.executiveAnalytics") || "EXECUTIVE ANALYTICS"}</span>
            </div>

            <h1 className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-[#063B61] dark:text-white">
              {t("reports.reportsTitle") || "Task Reports"}
            </h1>

            <p className="mt-0.5 text-xs sm:text-[13px] font-[450] leading-relaxed text-[#6B879B] dark:text-[#9FB6C0]">
              {t("reports.reportsSubtitle") || "Monitor organization-wide task performance, workload, priorities and completion progress."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#D8E4EC] bg-white px-3 py-2 text-xs font-semibold text-[#063B61] shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#D7E7EC]">
              <span className="h-2 w-2 rounded-full bg-[#00A878] animate-pulse" />
              <span>{t("reports.liveDatabase") || "Live Database"}</span>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 rounded-[9px] border border-[#D8E4EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#063B61] shadow-2xs hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#D7E7EC] dark:hover:bg-[#132E3A] transition"
              title="Export filtered data to CSV"
            >
              <Download size={14} className="text-[#087D8F] dark:text-[#4CD2DA]" />
              <span>{t("reports.exportCSV") || "Export CSV"}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadRawData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-[9px] bg-[#063B61] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#032F4D] active:scale-[0.99] disabled:opacity-60 dark:bg-[#0879D9] dark:hover:bg-[#0665B6]"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? (t("reports.refreshing") || "Refreshing...") : (t("reports.refresh") || "Refresh")}</span>
            </button>
          </div>
        </section>

        {/* =================================================
            2. CENTRAL GLOBAL FILTER TOOLBAR
        ================================================= */}
        <section className="rounded-[12px] border border-[#D8E4EC] bg-white p-3 sm:p-3.5 shadow-[0_2px_8px_rgba(6,61,99,0.02)] dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* LEFT: SELECTORS */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#D8E4EC] bg-[#F8FAFC] px-3 text-[11px] font-semibold text-[#063B61] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#CBD5E1]">
                <Filter size={13} className="text-[#087D8F] dark:text-[#4CD2DA]" />
                <span>{t("reports.filters") || "Filters"}</span>
              </div>

              {/* DATE RANGE SELECTOR */}
              <div className="relative">
                <select
                  value={filters.dateRange}
                  onChange={(e) => {
                    const val = e.target.value as DateRangeOption;
                    if (val === "CUSTOM") {
                      setModalFrom(filters.customFrom || new Date().toISOString().slice(0, 10));
                      setModalTo(filters.customTo || new Date().toISOString().slice(0, 10));
                      setCustomModalError("");
                      setIsCustomDateModalOpen(true);
                    } else {
                      setFilters((prev) => ({ ...prev, dateRange: val, customFrom: "", customTo: "" }));
                    }
                  }}
                  className="h-[38px] appearance-none rounded-[8px] border border-[#D8E4EC] bg-white pl-3 pr-7 text-[11.5px] font-semibold text-[#475569] outline-none transition hover:bg-[#F8FAFC] focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#CBD5E1]"
                >
                  <option value="TODAY">{t("reports.today") || "Today"}</option>
                  <option value="YESTERDAY">{t("reports.yesterday") || "Yesterday"}</option>
                  <option value="LAST_7_DAYS">{t("reports.last7Days") || "Last 7 Days"}</option>
                  <option value="THIS_WEEK">{t("reports.thisWeek") || "This Week"}</option>
                  <option value="LAST_WEEK">{t("reports.lastWeek") || "Last Week"}</option>
                  <option value="LAST_30_DAYS">{t("reports.last30Days") || "Last 30 Days"}</option>
                  <option value="THIS_MONTH">{t("reports.thisMonth") || "This Month"}</option>
                  <option value="LAST_MONTH">{t("reports.lastMonth") || "Last Month"}</option>
                  <option value="THIS_QUARTER">{t("reports.thisQuarter") || "This Quarter"}</option>
                  <option value="LAST_QUARTER">{t("reports.lastQuarter") || "Last Quarter"}</option>
                  <option value="THIS_YEAR">{t("reports.thisYear") || "This Year"}</option>
                  <option value="ALL_TIME">{t("reports.allTime") || "All Time"}</option>
                  <option value="CUSTOM">
                    {filters.dateRange === "CUSTOM" && filters.customFrom ? rangeBounds.label : (t("reports.custom") || "Custom Range...")}
                  </option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              </div>

              {/* STATUS FILTER */}
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
                  className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-7 text-[11.5px] font-semibold outline-none transition focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:bg-[#0D2430] ${
                    filters.status !== "ALL"
                      ? "border-[#00A6C7] bg-[#EFF8FB] text-[#087D8F] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#D8E4EC] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:text-[#CBD5E1]"
                  }`}
                >
                  <option value="ALL">{t("reports.allStatuses") || "All Statuses"}</option>
                  <option value="PENDING">{t("reports.pending") || "Pending"}</option>
                  <option value="IN_PROGRESS">{t("reports.inProgress") || "In Progress"}</option>
                  <option value="COMPLETED">{t("reports.completed") || "Completed"}</option>
                  <option value="OVERDUE">{t("reports.overdue") || "Overdue"}</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              </div>

              {/* PRIORITY FILTER */}
              <div className="relative">
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value as any }))}
                  className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-7 text-[11.5px] font-semibold outline-none transition focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:bg-[#0D2430] ${
                    filters.priority !== "ALL"
                      ? "border-[#00A6C7] bg-[#EFF8FB] text-[#087D8F] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#D8E4EC] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:text-[#CBD5E1]"
                  }`}
                >
                  <option value="ALL">{t("reports.allPriorities") || "All Priorities"}</option>
                  <option value="URGENT">{t("priority.URGENT") || "Urgent"}</option>
                  <option value="HIGH">{t("priority.HIGH") || "High"}</option>
                  <option value="MEDIUM">{t("priority.MEDIUM") || "Medium"}</option>
                  <option value="LOW">{t("priority.LOW") || "Low"}</option>
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              </div>

              {/* EMPLOYEE FILTER */}
              <div className="relative">
                <select
                  value={filters.employeeId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, employeeId: e.target.value }))}
                  className={`h-[38px] max-w-[170px] appearance-none truncate rounded-[8px] border pl-3 pr-7 text-[11.5px] font-semibold outline-none transition focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:bg-[#0D2430] ${
                    filters.employeeId !== "ALL"
                      ? "border-[#00A6C7] bg-[#EFF8FB] text-[#087D8F] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                      : "border-[#D8E4EC] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:text-[#CBD5E1]"
                  }`}
                >
                  <option value="ALL">{t("reports.allEmployees") || "All Employees"}</option>
                  {employees.map((emp) => {
                    const id = getEmployeeId(emp);
                    if (!id) return null;
                    return (
                      <option key={id} value={id}>
                        {getEmployeeName(emp, t("reports.employee") || "Unassigned", t("reports.employee") || "Employee")}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              </div>

              {/* DEPARTMENT FILTER */}
              {departments.length > 0 && (
                <div className="relative">
                  <select
                    value={filters.department}
                    onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
                    className={`h-[38px] max-w-[160px] appearance-none truncate rounded-[8px] border pl-3 pr-7 text-[11.5px] font-semibold outline-none transition focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:bg-[#0D2430] ${
                      filters.department !== "ALL"
                        ? "border-[#00A6C7] bg-[#EFF8FB] text-[#087D8F] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                        : "border-[#D8E4EC] bg-white text-[#475569] hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:text-[#CBD5E1]"
                    }`}
                  >
                    <option value="ALL">{t("reports.allDepartments") || "All Departments"}</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              )}
            </div>

            {/* RIGHT: SEARCH */}
            <div className="relative w-full lg:w-[260px]">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8497A1] dark:text-[#8FA8B2]" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder={t("reports.searchPlaceholder") || "Search report tasks..."}
                className="h-[38px] w-full rounded-[8px] border border-[#D8E4EC] bg-[#FBFDFE] pl-9 pr-8 text-xs font-medium text-[#063B61] placeholder-[#9AAAB2] outline-none transition focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8497A1] hover:text-[#E5484D]"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE FILTER SUMMARY CHIPS */}
          {hasActiveFilters && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#E8EFF3] pt-2.5 dark:border-[#1E435E]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8FA8B2]">
                {t("reports.activeFilters") || "Active Filters:"}
              </span>

              {filters.dateRange !== "LAST_7_DAYS" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  {t("reports.date") || "Date"}: {rangeBounds.label}
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, dateRange: "LAST_7_DAYS" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.status !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  {t("reports.status") || "Status"}: {t(`reports.${filters.status.toLowerCase()}`) || filters.status}
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, status: "ALL" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.priority !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  {t("reports.priority") || "Priority"}: {t(`priority.${filters.priority}`) || filters.priority}
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, priority: "ALL" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.employeeId !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  {t("reports.employee") || "Employee"}: {getEmployeeName(employeeMap.get(filters.employeeId), t("reports.employee"), t("reports.employee"))}
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, employeeId: "ALL" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.department !== "ALL" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  {t("reports.dept") || "Dept"}: {filters.department}
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, department: "ALL" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              {filters.search && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EFF8FB] px-2 py-0.5 text-[11px] font-semibold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  "{filters.search}"
                  <button type="button" onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}>
                    <X size={11} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto text-[11px] font-bold text-[#E5484D] hover:underline"
              >
                {t("reports.clearAll") || "Clear All"}
              </button>
            </div>
          )}
        </section>

        {/* =================================================
            3. DYNAMIC KPI SUMMARY STRIP (5 CARDS)
        ================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* TOTAL TASKS */}
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: "ALL" }))}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              filters.status === "ALL"
                ? "border-2 border-[#00A6C7] bg-white shadow-xs dark:border-[#4CD2DA] dark:bg-[#0B2538]"
                : "border-[#D8E4EC] bg-white hover:border-[#00A6C7]/50 dark:border-[#1E435E] dark:bg-[#0B2538]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                <ListTodo size={19} strokeWidth={2.2} />
              </div>
              {metrics.periodDelta ? (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                    metrics.periodDelta.isUp
                      ? "bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]"
                      : "bg-rose-50 text-[#E5484D] dark:bg-rose-950/40 dark:text-rose-400"
                  }`}
                >
                  {metrics.periodDelta.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {metrics.periodDelta.value}%
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-[#8497A1] dark:text-[#8FA8B2]">
                  {t("reports.current") || "Current"}
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.totalTasks") || "Total Tasks"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#063B61] dark:text-white">
                {metrics.total}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#8497A1] dark:text-[#8FA8B2]">
                {t("reports.inSelectedPeriod") || "In selected period"}
              </p>
            </div>
          </button>

          {/* PENDING */}
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: "PENDING" }))}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              filters.status === "PENDING"
                ? "border-2 border-amber-400 bg-white shadow-xs dark:border-amber-500 dark:bg-[#0B2538]"
                : "border-[#D8E4EC] bg-white hover:border-amber-300 dark:border-[#1E435E] dark:bg-[#0B2538]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFFBEB] text-[#F2A51A] dark:bg-[#451A03] dark:text-[#FBBF24]">
                <Clock3 size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] font-bold text-[#F2A51A]">
                {metrics.total > 0 ? Math.round((metrics.pending / metrics.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.pending") || "Pending"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#F2A51A] dark:text-[#FBBF24]">
                {metrics.pending}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#8497A1] dark:text-[#8FA8B2]">
                {t("reports.waitingToStart") || "Waiting to start"}
              </p>
            </div>
          </button>

          {/* IN PROGRESS */}
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: "IN_PROGRESS" }))}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              filters.status === "IN_PROGRESS"
                ? "border-2 border-sky-400 bg-white shadow-xs dark:border-sky-500 dark:bg-[#0B2538]"
                : "border-[#D8E4EC] bg-white hover:border-sky-300 dark:border-[#1E435E] dark:bg-[#0B2538]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0879D9] dark:bg-[#172D49] dark:text-[#78A9F0]">
                <CircleDot size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] font-bold text-[#0879D9]">
                {metrics.total > 0 ? Math.round((metrics.inProgress / metrics.total) * 100) : 0}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.inProgress") || "In Progress"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#0879D9] dark:text-[#60A5FA]">
                {metrics.inProgress}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#8497A1] dark:text-[#8FA8B2]">
                {t("reports.activeWork") || "Active work"}
              </p>
            </div>
          </button>

          {/* COMPLETED */}
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: "COMPLETED" }))}
            className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              filters.status === "COMPLETED"
                ? "border-2 border-emerald-400 bg-white shadow-xs dark:border-emerald-500 dark:bg-[#0B2538]"
                : "border-[#D8E4EC] bg-white hover:border-emerald-300 dark:border-[#1E435E] dark:bg-[#0B2538]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#00A878] dark:bg-[#064E3B] dark:text-[#34D399]">
                <CheckCircle2 size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] font-bold text-[#00A878]">
                {metrics.completionRate}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.completed") || "Completed"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#00A878] dark:text-[#34D399]">
                {metrics.completed}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#8497A1] dark:text-[#8FA8B2]">
                {t("reports.successfullyClosed") || "Successfully closed"}
              </p>
            </div>
          </button>

          {/* OVERDUE */}
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, status: "OVERDUE" }))}
            className={`col-span-2 sm:col-span-1 flex flex-col justify-between rounded-2xl border p-4 text-left transition-all ${
              filters.status === "OVERDUE"
                ? "border-2 border-rose-400 bg-white shadow-xs dark:border-rose-500 dark:bg-[#0B2538]"
                : "border-[#D8E4EC] bg-white hover:border-rose-300 dark:border-[#1E435E] dark:bg-[#0B2538]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-[#E5484D] dark:bg-rose-950/40 dark:text-rose-400">
                <CircleAlert size={19} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] font-bold text-[#E5484D]">
                {metrics.overdueRate}%
              </span>
            </div>
            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.overdue") || "Overdue"}
              </p>
              <p className="text-2xl font-bold tracking-tight text-[#E5484D] dark:text-rose-400">
                {metrics.overdue}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#8497A1] dark:text-[#8FA8B2]">
                {t("reports.needsEscalation") || "Needs escalation"}
              </p>
            </div>
          </button>
        </section>

        {/* =================================================
            4. ROW 1: STATUS BREAKDOWN & COMPLETION ANALYTICS
        ================================================= */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* DONUT: TASK STATUS BREAKDOWN */}
          <div className="rounded-2xl border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {t("reports.taskStatusBreakdown") || "TASK STATUS BREAKDOWN"}
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-[#063B61] dark:text-white">
                  {t("reports.taskDistribution") || "Task distribution"}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B879B] dark:text-[#8CB0C7]">
                  {t("reports.taskDistributionDesc") || "Organization-wide task health in the active reporting window."}
                </p>
              </div>

              <span className="rounded-lg border border-[#D8E4EC] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#6B879B] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#8FA8B2]">
                {rangeBounds.label}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-6 sm:flex-row">
              {/* SVG Donut */}
              <DynamicDonutChart
                total={metrics.total}
                centerTotalLabel={t("reports.totalTasks") || "TOTAL TASKS"}
                segments={[
                  { label: t("reports.completed") || "Completed", value: metrics.completed, color: "#00A878" },
                  { label: t("reports.inProgress") || "In Progress", value: metrics.inProgress, color: "#0879D9" },
                  { label: t("reports.pending") || "Pending", value: metrics.pending, color: "#F2A51A" },
                  { label: t("reports.overdue") || "Overdue", value: metrics.overdue, color: "#E5484D" },
                ]}
              />

              {/* Status List & Progress Meters */}
              <div className="w-full flex-1 space-y-2.5">
                {[
                  [t("reports.completed") || "Completed", metrics.completed, "#00A878", "bg-[#00A878]"],
                  [t("reports.inProgress") || "In Progress", metrics.inProgress, "#0879D9", "bg-[#0879D9]"],
                  [t("reports.pending") || "Pending", metrics.pending, "#F2A51A", "bg-[#F2A51A]"],
                  [t("reports.overdue") || "Overdue", metrics.overdue, "#E5484D", "bg-[#E5484D]"],
                ].map(([label, val, colorHex, bgClass]) => {
                  const num = Number(val) || 0;
                  const pct = metrics.total > 0 ? ((num / metrics.total) * 100).toFixed(1) : "0.0";

                  return (
                    <div
                      key={String(label)}
                      className="group rounded-xl p-2 transition-colors hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-bold text-[#063B61] dark:text-white">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: String(colorHex) }} />
                          {label}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#063B61] dark:text-white">{num}</span>
                          <span className="w-11 text-right text-[11px] font-semibold text-[#6B879B] dark:text-[#8CB0C7]">
                            {pct}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF4F7] dark:bg-[#163548]">
                        <div className={`h-full rounded-full ${bgClass}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* OVERALL COMPLETION ANALYTICS */}
          <div className="rounded-2xl border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {t("reports.completionAnalytics") || "COMPLETION ANALYTICS"}
                </p>
                <h2 className="mt-1 text-[17px] font-bold text-[#063B61] dark:text-white">
                  {t("reports.overallCompletion") || "Overall completion"}
                </h2>
                <p className="mt-0.5 text-[12px] text-[#6B879B] dark:text-[#8CB0C7]">
                  {t("reports.overallCompletionDesc") || "Completed work compared with the remaining workload."}
                </p>
              </div>

              <span className="rounded-lg border border-[#D8E4EC] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#6B879B] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#8FA8B2]">
                {rangeBounds.label}
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row">
              {/* Radial gauge */}
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(#00A878 ${metrics.completionRate}%, #EEF4F7 ${metrics.completionRate}% 100%)`,
                  }}
                />
                <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#0B2538]">
                  <span className="text-2xl font-extrabold text-[#063B61] dark:text-white">
                    {metrics.completionRate}%
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                    {t("reports.completed") || "COMPLETED"}
                  </span>
                </div>
              </div>

              {/* Progress bars */}
              <div className="w-full flex-1 space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-[#063B61] dark:text-white mb-1.5">
                    <span>{t("reports.completed") || "Completed"}</span>
                    <span className="text-[#6B879B] dark:text-[#8CB0C7] font-semibold">
                      {metrics.completed} / {metrics.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#EEF4F7] dark:bg-[#163548]">
                    <div
                      className="h-full rounded-full bg-[#00A878]"
                      style={{ width: `${metrics.completionRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-[#063B61] dark:text-white mb-1.5">
                    <span>{t("reports.remaining") || "Remaining"}</span>
                    <span className="text-[#6B879B] dark:text-[#8CB0C7] font-semibold">
                      {metrics.remaining} / {metrics.total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#EEF4F7] dark:bg-[#163548]">
                    <div
                      className="h-full rounded-full bg-[#F2A51A]"
                      style={{
                        width: `${metrics.total > 0 ? 100 - metrics.completionRate : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 2 sub-metrics */}
            <div className="mt-5 grid grid-cols-2 gap-3.5 pt-3 border-t border-[#EDF3F7] dark:border-[#1A3D56]">
              <div className="flex items-center gap-3 rounded-xl border border-[#EDF3F7] bg-[#FBFDFE] p-3 dark:border-[#1E435E] dark:bg-[#0D2430]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF9F5] text-[#00A878] dark:bg-[#123B36] dark:text-[#38DFBE]">
                  <CheckCircle2 size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                    {t("reports.completedTasks") || "COMPLETED TASKS"}
                  </p>
                  <p className="text-base font-bold text-[#063B61] dark:text-white">
                    {metrics.completed}
                  </p>
                  <p className="text-[10px] font-semibold text-[#00A878]">
                    {metrics.total > 0 ? `${metrics.completionRate}% ${t("reports.ofFiltered") || "of filtered"}` : (t("reports.noTasks") || "No tasks")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[#EDF3F7] bg-[#FBFDFE] p-3 dark:border-[#1E435E] dark:bg-[#0D2430]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#E5484D] dark:bg-rose-950/40 dark:text-rose-400">
                  <CircleAlert size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#6B879B] dark:text-[#8CB0C7]">
                    {t("reports.overdueRate") || "OVERDUE RATE"}
                  </p>
                  <p className="text-base font-bold text-[#063B61] dark:text-white">
                    {metrics.overdueRate}%
                  </p>
                  <p className="text-[10px] font-semibold text-[#E5484D]">
                    {metrics.overdue} {t("reports.tasksOverdue") || "task(s) overdue"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            5. FULL WIDTH: DYNAMIC DAILY TASK ACTIVITY
        ================================================= */}
        <section className="rounded-2xl border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                {t("reports.performanceTrendReports") || "PERFORMANCE & TREND REPORTS"}
              </p>
              <h2 className="mt-1 text-[17px] font-bold text-[#063B61] dark:text-white">
                {t("reports.dailyTaskActivity") || "Daily task activity"}
              </h2>
              <p className="mt-0.5 text-[12px] text-[#6B879B] dark:text-[#8CB0C7]">
                {t("reports.dailyTaskActivityDesc") || "Compare daily task creation with completed work across the reporting window."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <span className="rounded-lg border border-[#D8E4EC] bg-[#F8FAFC] px-2.5 py-1 text-[11px] font-semibold text-[#6B879B] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-[#8FA8B2]">
                {rangeBounds.label}
              </span>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-bold text-[#063B61] dark:text-white pl-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#0879D9]" />
                  {t("reports.created") || "Created"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#00A878]" />
                  {t("reports.completed") || "Completed"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <DynamicActivityBarChart
              data={activityTrend}
              emptyMessage={t("reports.noActivityRecorded") || "No activity recorded in this period."}
              createdLabel={t("reports.created") || "Created"}
              completedLabel={t("reports.completed") || "Completed"}
            />
          </div>
        </section>

        {/* =================================================
            6. ROW 3: PRIORITY DISTRIBUTION + EMPLOYEE WORKLOAD
        ================================================= */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* PRIORITY DISTRIBUTION */}
          <div className="rounded-2xl border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {t("reports.priority") || "PRIORITY"}
                </p>
                <h3 className="mt-1 text-[17px] font-bold text-[#063B61] dark:text-white">
                  {t("reports.priorityDistribution") || "Priority distribution"}
                </h3>
                <p className="mt-0.5 text-[12px] text-[#6B879B] dark:text-[#8CB0C7]">
                  {t("reports.priorityDesc") || "Workload divided by task urgency level."}
                </p>
              </div>

              <span className="text-xs font-bold text-[#063B61] dark:text-white">
                {metrics.total} {t("reports.total") || "Total"}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {priorityDistribution.map((p) => (
                <div key={p.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#063B61] dark:text-white">{p.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#063B61] dark:text-white">{p.count}</span>
                      <span className="w-10 text-right text-[11px] font-semibold text-[#6B879B] dark:text-[#8FA8B2]">
                        {p.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF4F7] dark:bg-[#163548]">
                    <div className={`h-full rounded-full ${p.bgClass}`} style={{ width: `${p.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* EMPLOYEE WORKLOAD */}
          <div className="rounded-2xl border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {t("reports.workloadAllocation") || "WORKLOAD ALLOCATION"}
                </p>
                <h3 className="mt-1 text-[17px] font-bold text-[#063B61] dark:text-white">
                  {t("reports.employeeWorkload") || "Employee workload"}
                </h3>
                <p className="mt-0.5 text-[12px] text-[#6B879B] dark:text-[#8CB0C7]">
                  {t("reports.employeeWorkloadDesc") || "Top assigned team members in the active reporting window."}
                </p>
              </div>

              <span className="text-xs font-bold text-[#063B61] dark:text-white">
                {employeeWorkload.length} {t("reports.assignees") || "Assignees"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {employeeWorkload.length === 0 ? (
                <p className="py-6 text-center text-xs font-semibold text-[#8497A1] dark:text-[#8FA8B2]">
                  {t("reports.noAssignedTasks") || "No assigned tasks found for this period."}
                </p>
              ) : (
                employeeWorkload.slice(0, 5).map((emp) => {
                  const maxWorkload = employeeWorkload[0]?.total || 1;
                  const relativePct = Math.round((emp.total / maxWorkload) * 100);

                  return (
                    <div
                      key={emp.id}
                      className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EFF7FB] text-xs font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                        {getEmployeeInitials(emp.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <p className="truncate font-bold text-[#063B61] dark:text-white">{emp.name}</p>
                          <span className="font-bold text-[#063B61] dark:text-white">
                            {emp.total} {t("reports.tasks") || "tasks"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="truncate text-[10.5px] text-[#6B879B] dark:text-[#8FA8B2]">
                            {emp.department} • {emp.completed} {t("reports.closed") || "closed"}
                          </span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#EEF4F7] dark:bg-[#163548]">
                            <div
                              className="h-full rounded-full bg-[#0879D9]"
                              style={{ width: `${relativePct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            7. RECENT TASK ACTIVITY TABLE
        ================================================= */}
        <section className="rounded-2xl border border-[#D8E4EC] bg-white shadow-[0_2px_12px_rgba(6,61,99,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#D8E4EC] p-4 sm:p-5 dark:border-[#1E435E]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                {t("reports.taskRecords") || "TASK RECORDS"}
              </p>
              <h3 className="text-base font-bold text-[#063B61] dark:text-white">
                {t("reports.filteredTasks") || "Filtered Tasks"} ({filteredTasks.length})
              </h3>
            </div>

            <button
              type="button"
              onClick={() => router.push("/admin/tasks")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#087D8F] hover:underline dark:text-[#4CD2DA]"
            >
              <span>{t("reports.manageTasks") || "Manage Tasks"}</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="enterprise-table w-full text-left border-collapse table-fixed border border-[#E2E8F0] dark:border-[#1E3A47]">
              <thead className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                <tr className="h-11 border-b border-[#D8DEE8] bg-[#F8FAFC] text-[10px] font-bold uppercase tracking-wider text-[#6B879B] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8FA8B2]">
                  <th className="w-[45%] px-5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("reports.taskHeader") || "TASK"}</th>
                  <th className="w-[20%] px-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("reports.assignedToHeader") || "ASSIGNED TO"}</th>
                  <th className="w-[12%] px-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("reports.priorityHeader") || "PRIORITY"}</th>
                  <th className="w-[13%] px-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("reports.dueDateHeader") || "DUE DATE"}</th>
                  <th className="w-[10%] px-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("reports.statusHeader") || "STATUS"}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-xs font-semibold text-[#8497A1] dark:text-[#8FA8B2]">
                      {t("reports.noMatchingTasks") || "No tasks found matching your active filters in this date window."}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.slice(0, 8).map((task) => (
                    <tr
                      key={task._id}
                      onClick={() => router.push(`/admin/tasks/${task._id}`)}
                      className="group h-[64px] cursor-pointer transition-colors hover:bg-[#F8FBFD] dark:hover:bg-[#132E3A]/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                            <ListTodo size={15} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-[#063B61] group-hover:text-[#0879D9] dark:text-white">
                              {task.title}
                            </p>
                            <p className="truncate text-[11px] text-[#6B879B] dark:text-[#8CB0C7]">
                              {task.description || t("reports.noDescription") || "No description provided"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <p className="truncate text-xs font-bold text-[#063B61] dark:text-white">
                          {getEmployeeName(task.assignedTo, t("reports.employee") || "Unassigned", t("reports.employee") || "Employee")}
                        </p>
                        <p className="truncate text-[10.5px] text-[#6B879B] dark:text-[#8FA8B2]">
                          {task.assignedTo && typeof task.assignedTo === "object"
                            ? task.assignedTo.department || "General"
                            : "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-md border px-2 py-0.5 text-[10px] font-bold text-[#063B61] dark:text-white border-[#D8E4EC] dark:border-[#3A5F71]">
                          {t(`priority.${task.priority || "medium"}`.toLowerCase()) || normalizePriority(task.priority)}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-xs text-[#536B77] dark:text-[#CBD5E1]">
                        {formatDate(task.dueDate, language)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs font-bold text-[#063B61] dark:text-white">
                          {t(`status.${task.status || "pending"}`.toLowerCase()) || normalizeStatus(task.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* =====================================================
          CUSTOM DATE RANGE MODAL
      ===================================================== */}
      <Modal
        isOpen={isCustomDateModalOpen}
        onClose={() => {
          setIsCustomDateModalOpen(false);
          if (!filters.customFrom) {
            setFilters((prev) => ({ ...prev, dateRange: "LAST_7_DAYS" }));
          }
        }}
        className="w-full max-w-sm"
      >
        <div className="w-full overflow-hidden rounded-[14px] border border-[#D8E4EC] bg-white shadow-xl dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex items-center justify-between border-b border-[#E8EFF3] px-5 py-4 dark:border-[#1E435E]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                <CalendarDays size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#063B61] dark:text-white">
                  {t("reports.customDateRange") || "Custom Date Range"}
                </h3>
                <p className="text-[11px] text-[#6B879B] dark:text-[#8FA8B2]">
                  {t("reports.filterReportsByCustomInterval") || "Filter reports by custom interval"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCustomDateModalOpen(false);
                if (!filters.customFrom) {
                  setFilters((prev) => ({ ...prev, dateRange: "LAST_7_DAYS" }));
                }
              }}
              className="rounded-lg p-1 text-[#8497A1] hover:bg-[#F5F9FA] hover:text-[#063B61] dark:text-[#8FA8B2]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5] mb-1">
                {t("reports.fromDate") || "From Date"}
              </label>
              <input
                type="date"
                value={modalFrom}
                onChange={(e) => {
                  setModalFrom(e.target.value);
                  if (modalTo && e.target.value > modalTo) {
                    setCustomModalError(t("reports.toDateAfterFromDate") || "To date must be after or equal to From date.");
                  } else {
                    setCustomModalError("");
                  }
                }}
                className="h-[38px] w-full rounded-[8px] border border-[#D8E4EC] bg-white px-3 text-xs sm:text-[13px] font-medium text-[#063B61] outline-none focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5] mb-1">
                {t("reports.toDate") || "To Date"}
              </label>
              <input
                type="date"
                value={modalTo}
                onChange={(e) => {
                  setModalTo(e.target.value);
                  if (modalFrom && e.target.value < modalFrom) {
                    setCustomModalError(t("reports.toDateAfterFromDate") || "To date must be after or equal to From date.");
                  } else {
                    setCustomModalError("");
                  }
                }}
                className="h-[38px] w-full rounded-[8px] border border-[#D8E4EC] bg-white px-3 text-xs sm:text-[13px] font-medium text-[#063B61] outline-none focus:border-[#00A6C7] focus:ring-1 focus:ring-[#00A6C7] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              />
            </div>

            {customModalError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-[#E5484D] dark:bg-rose-950/40 dark:text-rose-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>{customModalError}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#E8EFF3] px-5 py-3 bg-[#F8FAFC]/50 dark:border-[#1E435E] dark:bg-[#0D2430]/40">
            <button
              type="button"
              onClick={() => {
                setFilters((prev) => ({ ...prev, dateRange: "LAST_7_DAYS", customFrom: "", customTo: "" }));
                setIsCustomDateModalOpen(false);
              }}
              className="text-xs font-semibold text-[#6B879B] hover:text-[#087D8F] dark:text-[#8FA8B2]"
            >
              {t("reports.resetToLast7Days") || "Reset to Last 7 Days"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomDateModalOpen(false);
                  if (!filters.customFrom) {
                    setFilters((prev) => ({ ...prev, dateRange: "LAST_7_DAYS" }));
                  }
                }}
                className="rounded-[8px] border border-[#D8E4EC] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#6B879B] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8FA8B2]"
              >
                {t("common.cancel") || "Cancel"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!modalFrom || !modalTo) {
                    setCustomModalError(t("reports.selectBothDates") || "Please select both From and To dates.");
                    return;
                  }
                  if (modalTo < modalFrom) {
                    setCustomModalError(t("reports.toDateAfterFromDate") || "To date must be after or equal to From date.");
                    return;
                  }

                  setFilters((prev) => ({
                    ...prev,
                    dateRange: "CUSTOM",
                    customFrom: modalFrom,
                    customTo: modalTo,
                  }));
                  setCustomModalError("");
                  setIsCustomDateModalOpen(false);
                }}
                className="rounded-[8px] bg-[#063B61] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#032F4D] dark:bg-[#0879D9]"
              >
                {t("reports.applyRange") || "Apply Range"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </main>
  );
}