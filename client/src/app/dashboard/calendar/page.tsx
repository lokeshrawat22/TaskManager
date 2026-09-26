"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Filter,
  RefreshCw,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { Modal } from "@/components/ui/Modal";
import {
  StatCard,
  StatusBadge,
  PriorityBadge,
  LoadingState,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type Task = {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  assignedTo?: any;
};

// =====================================================
// HELPERS
// =====================================================

function normalizeStatus(status?: string): "PENDING" | "IN_PROGRESS" | "COMPLETED" {
  const s = status?.toUpperCase().replace(/\s+/g, "_") || "PENDING";
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "IN_PROGRESS" || s === "INPROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function normalizePriority(priority?: string): "LOW" | "MEDIUM" | "HIGH" | "URGENT" {
  const p = priority?.toUpperCase() || "MEDIUM";
  if (p === "HIGH") return "HIGH";
  if (p === "URGENT") return "URGENT";
  if (p === "LOW") return "LOW";
  return "MEDIUM";
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseTaskDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || normalizeStatus(task.status) === "COMPLETED") {
    return false;
  }
  const dueTime = new Date(task.dueDate).getTime();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return !Number.isNaN(dueTime) && dueTime < startOfToday.getTime();
}

// =====================================================
// EMPLOYEE CALENDAR PAGE COMPONENT
// =====================================================

export default function EmployeeCalendarPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchCalendarTasks = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const response = await apiRequest<any>("/api/tasks/my?limit=100", {
        method: "GET",
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to load calendar events");
      }

      const fetchedTasks = response?.data?.tasks || [];
      setTasks(fetchedTasks);
    } catch (err: any) {
      console.error("[EMPLOYEE CALENDAR] Load error:", err);
      setError(err?.message || "Unable to load calendar events.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCalendarTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        (task.title || "").toLowerCase().includes(q) ||
        (task.description || "").toLowerCase().includes(q);

      const sNorm = normalizeStatus(task.status);
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OVERDUE" ? isOverdue(task) : sNorm === statusFilter);

      const pNorm = normalizePriority(task.priority);
      const matchPriority = priorityFilter === "ALL" || pNorm === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    filteredTasks.forEach((task) => {
      const d = parseTaskDate(task.dueDate);
      if (!d) return;

      const key = dateKey(d);
      const existing = map.get(key) || [];
      existing.push(task);
      map.set(key, existing);
    });

    return map;
  }, [filteredTasks]);

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: {
      date: Date;
      isCurrentMonth: boolean;
      key: string;
    }[] = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: dateKey(d),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        isCurrentMonth: true,
        key: dateKey(d),
      });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        key: dateKey(d),
      });
    }

    return cells;
  }, [currentDate]);

  const selectedDayKey = dateKey(selectedDate);
  const selectedDayTasks = tasksByDate.get(selectedDayKey) || [];

  const monthTasks = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return filteredTasks.filter((task) => {
      const d = parseTaskDate(task.dueDate);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [filteredTasks, currentDate]);

  const monthCompleted = monthTasks.filter(
    (t) => normalizeStatus(t.status) === "COMPLETED"
  ).length;

  const monthRemaining = monthTasks.length - monthCompleted;

  const formattedMonthYear = currentDate.toLocaleDateString(
    language === "hi" ? "hi-IN" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  const formattedSelectedDate = selectedDate.toLocaleDateString(
    language === "hi" ? "hi-IN" : "en-US",
    {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  const goToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const goPreviousMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goNextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading && !refreshing) {
    return <LoadingState message="Loading calendar schedule..." rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          1. CALENDAR PAGE HEADER
      ================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
              {t("calendar.scheduleManagement") || "SCHEDULE MANAGEMENT"}
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {t("navigation.calendar") || "Calendar"}
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B] dark:text-[#94A3B8]">
            {t("calendar.planDeadlinesMonitorWorkload") || "Plan your workload, track due dates, and monitor upcoming deadlines."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchCalendarTasks(true)}
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
          2. MONTH KPI SUMMARY TILES (3 TILES)
      ================================================= */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Scheduled This Month"
          value={monthTasks.length}
          subtitle="All tasks due in month"
          icon={CalendarDays}
          variant="primary"
        />
        <StatCard
          title="Finished This Month"
          value={monthCompleted}
          subtitle="Completed milestones"
          icon={CheckCircle2}
          variant="emerald"
        />
        <StatCard
          title="Remaining Work"
          value={monthRemaining}
          subtitle="Pending execution"
          icon={Clock3}
          variant="amber"
        />
      </div>

      {/* =================================================
          3. FILTER TOOLBAR & MONTH CONTROLS
      ================================================= */}
      <div className="rounded-[14px] border border-[#CBD5E1] bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("calendar.searchPlaceholder") || "Search scheduled tasks..."}
                className="h-[38px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#FBFDFE] pl-9 pr-8 text-[13px] font-normal text-[#0F172A] placeholder-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white dark:placeholder-[#94A3B8]"
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

            {/* STATUS FILTER */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium outline-none transition cursor-pointer ${
                  statusFilter !== "ALL"
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                    : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                }`}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="OVERDUE">Overdue</option>
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
                className={`h-[38px] appearance-none rounded-[8px] border pl-3 pr-8 text-[13px] font-medium outline-none transition cursor-pointer ${
                  priorityFilter !== "ALL"
                    ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] dark:border-[#00A6C7] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                    : "border-[#CBD5E1] bg-white text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#2A4858] dark:text-[#CBD5E1] dark:hover:bg-[#18333F]"
                }`}
              >
                <option value="ALL">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
              />
            </div>
          </div>

          {/* MONTH NAVIGATION CONTROLS */}
          <div className="flex items-center gap-2 sm:self-center">
            <button
              type="button"
              onClick={goToday}
              className="h-[38px] rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] transition cursor-pointer"
            >
              {t("calendar.today") || "Today"}
            </button>

            <div className="flex items-center rounded-[8px] border border-[#CBD5E1] bg-white dark:border-[#1E3A47] dark:bg-[#0B202B]">
              <button
                type="button"
                onClick={goPreviousMonth}
                aria-label="Previous month"
                className="flex h-[36px] w-[36px] items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:text-[#CBD5E1] dark:hover:bg-[#102A36] dark:hover:text-white transition rounded-l-[7px] cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <span className="min-w-[130px] px-2 text-center text-[13px] font-bold text-[#0F172A] dark:text-white">
                {formattedMonthYear}
              </span>

              <button
                type="button"
                onClick={goNextMonth}
                aria-label="Next month"
                className="flex h-[36px] w-[36px] items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:text-[#CBD5E1] dark:hover:bg-[#102A36] dark:hover:text-white transition rounded-r-[7px] cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================
          4. MAIN CALENDAR GRID (~70%) + DAILY SCHEDULE (~30%)
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =================================================
            MAIN CALENDAR GRID (70% - lg:col-span-8)
        ================================================= */}
        <div className="lg:col-span-8 rounded-[14px] border border-[#CBD5E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B] overflow-hidden">
          <div className="w-full overflow-x-auto responsive-table-scroll">
            <div className="min-w-[620px]">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-[#CBD5E1] bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#102A36]">
                {weekDayLabels.map((day) => (
                  <div
                    key={day}
                    className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] dark:text-[#CBD5E1]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days 7-column Grid */}
              <div className="grid grid-cols-7 border-collapse">
                {calendarGrid.map((cell, idx) => {
                  const dayTasks = tasksByDate.get(cell.key) || [];
                  const isSelected = isSameDay(cell.date, selectedDate);
                  const isToday = isSameDay(cell.date, new Date());

                  return (
                    <div
                      key={cell.key + idx}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[105px] sm:min-h-[115px] p-1.5 sm:p-2 border-r border-b border-[#E5E7EB] dark:border-[#18333F] transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[#EFF6FF]/60 dark:bg-[#0C3345]/40 ring-1 ring-inset ring-[#2563EB]/40 dark:ring-[#38BDF8]/40"
                          : "hover:bg-[#F8FAFC] dark:hover:bg-[#102A36]"
                      } ${!cell.isCurrentMonth ? "opacity-40" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-bold ${
                            isToday
                              ? "bg-[#2563EB] text-white"
                              : isSelected
                              ? "font-bold text-[#2563EB] dark:text-[#38BDF8]"
                              : "text-[#0F172A] dark:text-white"
                          }`}
                        >
                          {cell.date.getDate()}
                        </span>

                        {dayTasks.length > 0 && (
                          <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8]">
                            {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                          </span>
                        )}
                      </div>

                      {/* Task Pills */}
                      <div className="space-y-1 overflow-hidden">
                        {dayTasks.slice(0, 3).map((task) => {
                          const sNorm = normalizeStatus(task.status);
                          const overdue = isOverdue(task);

                          let chipBg = "bg-[#FFFBEB] text-[#D97706] border-[#FDE3B5] dark:bg-[#451A03]/60 dark:text-[#FBBF24] dark:border-[#634310]";
                          if (sNorm === "COMPLETED") {
                            chipBg = "bg-[#ECFDF5] text-[#00875A] border-[#A7F3D0] dark:bg-[#064E3B]/60 dark:text-[#34D399] dark:border-[#065F46]";
                          } else if (sNorm === "IN_PROGRESS") {
                            chipBg = "bg-[#EFF6FF] text-[#0284C7] border-[#BFDBFE] dark:bg-[#1E3A5F]/60 dark:text-[#38BDF8] dark:border-[#1E435E]";
                          } else if (overdue) {
                            chipBg = "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
                          }

                          return (
                            <div
                              key={task._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                              }}
                              className={`truncate rounded-[5px] border px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight transition-transform hover:scale-[1.02] ${chipBg}`}
                              title={task.title}
                            >
                              {task.title}
                            </div>
                          );
                        })}

                        {dayTasks.length > 3 && (
                          <p className="text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8] pl-1">
                            +{dayTasks.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            DAILY SCHEDULE PANEL (30% - lg:col-span-4)
        ================================================= */}
        <div className="lg:col-span-4 rounded-[14px] border border-[#CBD5E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B] overflow-hidden">
          <div className="border-b border-[#CBD5E1] dark:border-[#1E3A47] p-4 bg-[#F8FAFC] dark:bg-[#102A36]">
            <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#2563EB] dark:text-[#38BDF8]">
              {t("calendar.dailySchedule") || "DAILY SCHEDULE"}
            </p>
            <h2 className="mt-0.5 text-[16px] font-bold text-[#0F172A] dark:text-white">
              {formattedSelectedDate}
            </h2>
          </div>

          <div className="p-4">
            {selectedDayTasks.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] dark:bg-[#102A36] dark:text-[#38BDF8] border border-[#CBD5E1] dark:border-[#1E3A47]">
                  <CalendarDays size={18} />
                </div>
                <p className="mt-3 text-[13px] font-semibold text-[#0F172A] dark:text-white">
                  No tasks due on this date
                </p>
                <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  Select another day or adjust your filters.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayTasks.map((task) => {
                  const overdue = isOverdue(task);

                  return (
                    <div
                      key={task._id}
                      onClick={() => setSelectedTask(task)}
                      className="group rounded-[10px] border border-[#CBD5E1] bg-white p-3.5 transition-colors hover:border-[#2563EB] hover:bg-[#F8FAFC] shadow-2xs cursor-pointer dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8] dark:hover:bg-[#102A36]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status} size="sm" />
                      </div>

                      <h3 className="text-[13.5px] font-bold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors line-clamp-2">
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="mt-1 text-[11.5px] text-[#64748B] dark:text-[#94A3B8] line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-[#E5E7EB] pt-2.5 text-xs dark:border-[#18333F]">
                        <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          {overdue ? (
                            <span className="font-semibold text-[#DC2626]">Overdue</span>
                          ) : (
                            "Due today"
                          )}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] dark:text-[#38BDF8]">
                          <span>Details</span>
                          <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          TASK DETAILS MODAL
      ================================================= */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          ariaLabel={selectedTask.title}
        >
          <div className="space-y-4 text-xs sm:text-[13px]">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              {selectedTask.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={selectedTask.priority} />
              <StatusBadge status={selectedTask.status} />
            </div>

            {selectedTask.description && (
              <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-[#475569] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#CBD5E1]">
                <p className="whitespace-pre-wrap">{selectedTask.description}</p>
              </div>
            )}

            <div className="space-y-2 border-t border-[#E5E7EB] pt-3 dark:border-[#18333F]">
              <div className="flex justify-between">
                <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">Due Date:</span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No due date"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB] dark:border-[#18333F]">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/tasks/${selectedTask._id}`)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <span>Open Task Page</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}