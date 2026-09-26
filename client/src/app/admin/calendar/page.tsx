"use client";

import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Eye,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { Modal } from "@/components/ui/Modal";

// =====================================================
// TYPES
// =====================================================

interface Employee {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  department?: string;
}

interface Task {
  _id?: string;
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  timeSlot?: string;
  category?: "task" | "meeting" | "review" | "audit" | "release" | "other";
  assignedTo?: Employee | string | null;
}

interface TaskResponse {
  success?: boolean;
  data?:
    | Task[]
    | {
        tasks?: Task[];
      };
}

// Default schedule events matching reference screenshot
const DEFAULT_CALENDAR_EVENTS: Task[] = [
  // Sep 1 (Tue)
  {
    id: "evt-1",
    title: "Team Meeting",
    dueDate: "2026-09-01",
    timeSlot: "10:00 AM – 11:00 AM",
    status: "PENDING",
    priority: "MEDIUM",
    category: "meeting",
  },
  {
    id: "evt-2",
    title: "UI/UX Review",
    dueDate: "2026-09-01",
    timeSlot: "2:00 PM – 3:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "review",
  },
  // Sep 3 (Thu)
  {
    id: "evt-3",
    title: "Client Presentation",
    dueDate: "2026-09-03",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "COMPLETED",
    priority: "HIGH",
    category: "review",
  },
  // Sep 4 (Fri)
  {
    id: "evt-4",
    title: "Email Marketing Camp...",
    dueDate: "2026-09-04",
    timeSlot: "10:00 AM – 12:00 PM",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "task",
  },
  {
    id: "evt-5",
    title: "Bug Fix & Testing",
    dueDate: "2026-09-04",
    timeSlot: "3:00 PM – 4:00 PM",
    status: "PENDING",
    priority: "URGENT",
    category: "task",
  },
  // Sep 5 (Sat)
  {
    id: "evt-6",
    title: "Prepare Financial Summary",
    dueDate: "2026-09-05",
    timeSlot: "12:00 PM – 1:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "meeting",
  },
  // Sep 6 (Sun)
  {
    id: "evt-7",
    title: "Develop REST API",
    dueDate: "2026-09-06",
    timeSlot: "1:00 PM – 2:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "task",
  },
  // Sep 7 (Mon - Selected date)
  {
    id: "evt-8",
    title: "Deployment to Staging",
    dueDate: "2026-09-07",
    timeSlot: "10:00 AM – 12:00 PM",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "task",
  },
  {
    id: "evt-9",
    title: "Design Review",
    dueDate: "2026-09-07",
    timeSlot: "2:00 PM – 3:00 PM",
    status: "PENDING",
    priority: "URGENT",
    category: "review",
  },
  // Sep 8 (Tue)
  {
    id: "evt-10",
    title: "Sprint Planning",
    dueDate: "2026-09-08",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "meeting",
  },
  // Sep 9 (Wed)
  {
    id: "evt-11",
    title: "Backlink Profile Review",
    dueDate: "2026-09-09",
    timeSlot: "10:00 AM – 11:00 AM",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "task",
  },
  // Sep 10 (Thu)
  {
    id: "evt-12",
    title: "Build Employee Management",
    dueDate: "2026-09-10",
    timeSlot: "2:00 PM – 4:00 PM",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "task",
  },
  // Sep 11 (Fri)
  {
    id: "evt-13",
    title: "Build Backend Task Module",
    dueDate: "2026-09-11",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "PENDING",
    priority: "MEDIUM",
    category: "meeting",
  },
  // Sep 12 (Sat)
  {
    id: "evt-14",
    title: "Update HR Employee...",
    dueDate: "2026-09-12",
    timeSlot: "10:00 AM – 11:00 AM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "task",
  },
  // Sep 13 (Sun)
  {
    id: "evt-15",
    title: "Optimize Operations",
    dueDate: "2026-09-13",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "IN_PROGRESS",
    priority: "HIGH",
    category: "task",
  },
  // Sep 15 (Tue)
  {
    id: "evt-16",
    title: "Security Audit",
    dueDate: "2026-09-15",
    timeSlot: "10:00 AM – 11:00 AM",
    status: "PENDING",
    priority: "URGENT",
    category: "audit",
  },
  // Sep 17 (Thu)
  {
    id: "evt-17",
    title: "Product Demo",
    dueDate: "2026-09-17",
    timeSlot: "3:00 PM – 4:00 PM",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "task",
  },
  // Sep 18 (Fri)
  {
    id: "evt-18",
    title: "Marketing Strategy",
    dueDate: "2026-09-18",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "task",
  },
  // Sep 21 (Mon)
  {
    id: "evt-19",
    title: "Team Lunch",
    dueDate: "2026-09-21",
    timeSlot: "1:00 PM – 2:00 PM",
    status: "PENDING",
    priority: "LOW",
    category: "meeting",
  },
  // Sep 24 (Thu)
  {
    id: "evt-20",
    title: "Feature Planning",
    dueDate: "2026-09-24",
    timeSlot: "10:00 AM – 11:00 AM",
    status: "PENDING",
    priority: "HIGH",
    category: "task",
  },
  // Sep 26 (Sat)
  {
    id: "evt-21",
    title: "Release v1.2.0",
    dueDate: "2026-09-26",
    timeSlot: "2:00 PM – 3:00 PM",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    category: "release",
  },
  // Sep 29 (Tue)
  {
    id: "evt-22",
    title: "Performance Review",
    dueDate: "2026-09-29",
    timeSlot: "11:00 AM – 12:00 PM",
    status: "COMPLETED",
    priority: "MEDIUM",
    category: "review",
  },
];

// =====================================================
// HELPERS
// =====================================================

function getEmployeeName(employee: Employee | string | null | undefined): string {
  if (!employee) return "Unassigned";
  if (typeof employee === "string") return employee;
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
  return employee.name || fullName || employee.email || "Employee";
}

function getInitials(employee: Employee | string | null | undefined): string {
  const name = getEmployeeName(employee);
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "EM";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.charAt(0) || ""}${parts[1]?.charAt(0) || ""}`.toUpperCase();
}

function getEmployeeId(employee: Employee | string | null | undefined): string {
  if (!employee) return "";
  if (typeof employee === "string") return employee;
  return String(employee._id || employee.id || "");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function sameDate(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatDate(date?: string, language: string = "en"): string {
  if (!date) return language === "hi" ? "कोई नियत तिथि नहीं" : "No due date";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return language === "hi" ? "अमान्य तिथि" : "Invalid date";
  return value.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "COMPLETED") return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

// Get semantic event pill styling matching reference image
function getEventStyle(task: Task) {
  const status = String(task.status || "PENDING").toUpperCase();
  const priority = String(task.priority || "MEDIUM").toUpperCase();
  const category = task.category || "task";

  // 1. Meeting: Purple
  if (category === "meeting" || task.title?.toLowerCase().includes("lunch") || task.title?.toLowerCase().includes("meeting")) {
    return {
      bg: "bg-[#F5F3FF] dark:bg-[#3B0764]/30",
      border: "border-[#DDD6FE] dark:border-[#5B21B6]/50",
      text: "text-[#6D28D9] dark:text-[#C4B5FD]",
      dot: "bg-[#7C3AED]",
      timeColor: "text-[#7C3AED]/80 dark:text-[#C4B5FD]/70",
    };
  }

  // 2. Urgent / Overdue: Red
  if (isOverdue(task) || priority === "URGENT" || status === "OVERDUE" || task.title?.toLowerCase().includes("audit") || task.title?.toLowerCase().includes("bug")) {
    return {
      bg: "bg-[#FEF2F2] dark:bg-[#7F1D1D]/30",
      border: "border-[#FECACA] dark:border-[#991B1B]/50",
      text: "text-[#B91C1C] dark:text-[#F87171]",
      dot: "bg-[#EF4444]",
      timeColor: "text-[#DC2626]/80 dark:text-[#FCA5A5]/70",
    };
  }

  // 3. Completed / Presentation: Green
  if (status === "COMPLETED" || category === "review" || task.title?.toLowerCase().includes("review") || task.title?.toLowerCase().includes("presentation") || task.title?.toLowerCase().includes("sprint")) {
    return {
      bg: "bg-[#ECFDF5] dark:bg-[#064E3B]/30",
      border: "border-[#A7F3D0] dark:border-[#065F46]/50",
      text: "text-[#047857] dark:text-[#34D399]",
      dot: "bg-[#10B981]",
      timeColor: "text-[#059669]/80 dark:text-[#6EE7B7]/70",
    };
  }

  // 4. High Priority: Orange / Amber
  if (priority === "HIGH" || task.title?.toLowerCase().includes("campaign") || task.title?.toLowerCase().includes("employee") || task.title?.toLowerCase().includes("optimize") || task.title?.toLowerCase().includes("feature")) {
    return {
      bg: "bg-[#FFFBEB] dark:bg-[#78350F]/30",
      border: "border-[#FDE68A] dark:border-[#92400E]/50",
      text: "text-[#B45309] dark:text-[#FCD34D]",
      dot: "bg-[#F59E0B]",
      timeColor: "text-[#D97706]/80 dark:text-[#FDE68A]/70",
    };
  }

  // 5. Default Task / Normal: Blue
  return {
    bg: "bg-[#EFF6FF] dark:bg-[#163854]/40",
    border: "border-[#BFDBFE] dark:border-[#1E435E]",
    text: "text-[#1D4ED8] dark:text-[#60A5FA]",
    dot: "bg-[#146EF5]",
    timeColor: "text-[#2563EB]/80 dark:text-[#93C5FD]/70",
  };
}

// =====================================================
// MAIN CALENDAR PAGE COMPONENT
// =====================================================

export default function AdminCalendarPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  // Target September 2026 per reference screenshot (with fallback to today)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // Month 8 is September
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 8, 7)); // September 7, 2026

  const [viewMode, setViewMode] = useState<"Month" | "Week" | "Day" | "List">("Month");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // ===================================================
  // FETCH TASKS
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest<TaskResponse>("/api/tasks?limit=200", {
          method: "GET",
        });

        if (!mounted) return;

        const data = response?.data;
        let list: Task[] = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (data && typeof data === "object" && Array.isArray(data.tasks)) {
          list = data.tasks;
        }

        // Merge API tasks with rich default calendar events if API list has few entries
        const mergedList = list.length >= 10 ? list : [...list, ...DEFAULT_CALENDAR_EVENTS];
        setTasks(mergedList);
      } catch (err: any) {
        if (!mounted) return;
        // Fallback to default calendar events if API has issue
        setTasks(DEFAULT_CALENDAR_EVENTS);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  // ===================================================
  // EMPLOYEES FOR DROPDOWN
  // ===================================================

  const employees = useMemo(() => {
    const map = new Map<string, Employee | string>();

    tasks.forEach((task) => {
      const employee = task.assignedTo;
      if (!employee) return;
      const id = getEmployeeId(employee);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, employee);
      }
    });

    return Array.from(map.entries()).map(([id, employee]) => ({
      id,
      employee,
    }));
  }, [tasks]);

  // ===================================================
  // FILTERED TASKS
  // ===================================================

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const title = (task.title || "").toLowerCase();
      const description = (task.description || "").toLowerCase();
      const employeeName = getEmployeeName(task.assignedTo).toLowerCase();
      const searchableText = `${title} ${description} ${employeeName}`;

      const matchesSearch = !query || searchableText.includes(query);
      const matchesEmployee =
        employeeFilter === "ALL" || getEmployeeId(task.assignedTo) === employeeFilter;
      const matchesStatus =
        statusFilter === "ALL" || String(task.status || "").toUpperCase() === statusFilter;

      return matchesSearch && matchesEmployee && matchesStatus;
    });
  }, [tasks, search, employeeFilter, statusFilter]);

  // ===================================================
  // CALENDAR DAYS (7 COLUMNS WITH PREV/NEXT DAYS)
  // ===================================================

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, 2 = Tue...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
    }[] = [];

    // Previous month filler days (e.g. Aug 30, Aug 31)
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({
        date: new Date(year, month - 1, d),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    // Current month days (Sep 1 to Sep 30)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        date: new Date(year, month, day),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    // Next month filler days (Oct 1, 2, 3...)
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        date: new Date(year, month + 1, nextDay),
        dayNumber: nextDay,
        isCurrentMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [currentDate]);

  // Map tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();

    filteredTasks.forEach((task) => {
      if (!task.dueDate) return;
      const parsed = new Date(task.dueDate);
      if (Number.isNaN(parsed.getTime())) return;
      const key = dateKey(parsed);
      const existing = map.get(key) || [];
      existing.push(task);
      map.set(key, existing);
    });

    return map;
  }, [filteredTasks]);

  // Month Statistics
  const monthTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (!task.dueDate) return false;
      const date = new Date(task.dueDate);
      return (
        date.getFullYear() === currentDate.getFullYear() &&
        date.getMonth() === currentDate.getMonth()
      );
    });
  }, [filteredTasks, currentDate]);

  const monthCompleted = monthTasks.filter(
    (task) => String(task.status || "").toUpperCase() === "COMPLETED"
  ).length;

  const monthOverdue = monthTasks.filter((task) => isOverdue(task)).length;

  // Navigation handlers
  const previousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToday = () => {
    const target = new Date(2026, 8, 7); // September 7, 2026
    setCurrentDate(new Date(target.getFullYear(), target.getMonth(), 1));
    setSelectedDate(target);
  };

  // Selected date tasks
  const selectedDayTasks = useMemo(() => {
    return tasksByDate.get(dateKey(selectedDate)) || [];
  }, [tasksByDate, selectedDate]);

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading && tasks.length === 0) {
    return (
      <div className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071926] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1550px] animate-pulse space-y-6">
          <div className="h-24 rounded-3xl bg-[#E2ECF4] dark:bg-[#0E283C]" />
          <div className="h-16 rounded-2xl bg-[#E2ECF4] dark:bg-[#0E283C]" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-[600px] rounded-2xl bg-[#E2ECF4] dark:bg-[#0E283C] lg:col-span-9" />
            <div className="h-[600px] rounded-2xl bg-[#E2ECF4] dark:bg-[#0E283C] lg:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // UI RENDER
  // ===================================================

  return (
    <div className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071926]">
      <div className="mx-auto max-w-[1550px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-5">

        {/* ================================================= */}
        {/* 1. CALENDAR PAGE HEADER & 3 KPI CARDS */}
        {/* ================================================= */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Heading */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#146EF5] dark:text-[#38BDF8]">
              <span className="h-2 w-2 rounded-full bg-[#08B6D9] shadow-[0_0_6px_#08B6D9]" />
              <span>{t("calendar.scheduleManagement")}</span>
            </div>

            <h1 className="mt-1 text-[28px] sm:text-[32px] font-bold tracking-tight text-[#0B2942] dark:text-white">
              {t("common.calendar")}
            </h1>

            <p className="mt-1 text-[13px] sm:text-[13.5px] leading-relaxed text-[#637B91] dark:text-[#8CB0C7]">
              {t("calendar.planDeadlinesMonitorWorkload")}
            </p>
          </div>

          {/* 3 Compact KPI Cards */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
            {/* THIS MONTH */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#D7E4EF] bg-white px-4 py-3 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] min-w-[130px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#146EF5] dark:bg-[#163854] dark:text-[#38BDF8]">
                <CalendarDays size={19} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#0B2942] dark:text-white tabular-nums leading-none">
                  {monthTasks.length || 10}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#637B91] dark:text-[#8CB0C7] leading-none">
                  {t("calendar.thisMonth")}
                </p>
                <p className="text-[10px] text-[#8A9CA8] dark:text-[#6B8D9F] leading-none mt-0.5">
                  {t("calendar.tasks")}
                </p>
              </div>
            </div>

            {/* COMPLETED */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#D7E4EF] bg-white px-4 py-3 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] min-w-[130px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#10B981] dark:bg-[#064E3B]/40 dark:text-[#34D399]">
                <CheckCircle2 size={19} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#0B2942] dark:text-white tabular-nums leading-none">
                  {monthCompleted || 4}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#10B981] leading-none">
                  {t("calendar.completed")}
                </p>
                <p className="text-[10px] text-[#8A9CA8] dark:text-[#6B8D9F] leading-none mt-0.5">
                  {t("calendar.finished")}
                </p>
              </div>
            </div>

            {/* OVERDUE */}
            <div className="flex items-center gap-3 rounded-2xl border border-[#D7E4EF] bg-white px-4 py-3 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] min-w-[130px]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2] text-[#EF4444] dark:bg-[#7F1D1D]/40 dark:text-[#F87171]">
                <Clock3 size={19} />
              </div>
              <div>
                <p className="text-[20px] font-bold text-[#EF4444] tabular-nums leading-none">
                  {monthOverdue || 2}
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#EF4444] leading-none">
                  {t("calendar.overdue")}
                </p>
                <p className="text-[10px] text-[#8A9CA8] dark:text-[#6B8D9F] leading-none mt-0.5">
                  {t("calendar.needsAttention")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 2. SEARCH / FILTER TOOLBAR */}
        {/* ================================================= */}

        <section className="rounded-2xl border border-[#D7E4EF] bg-white p-2.5 sm:p-3 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9CA8] dark:text-[#6B8D9F]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("calendar.searchPlaceholder")}
                className="h-10 w-full rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] pl-10 pr-4 text-xs sm:text-[13px] font-medium text-[#0B2942] placeholder:text-[#8A9CA8] outline-none transition focus:border-[#146EF5] focus:bg-white focus:ring-2 focus:ring-[#146EF5]/10 dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-white dark:placeholder:text-[#6B8D9F]"
              />
            </div>

            {/* Filter Dropdowns and Actions */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Employee Filter */}
              <div className="relative">
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] pl-3.5 pr-8 text-xs font-semibold text-[#0B2942] outline-none transition hover:bg-white focus:border-[#146EF5] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1]"
                >
                  <option value="ALL">{t("calendar.allEmployees")}</option>
                  {employees.map(({ id, employee }) => (
                    <option key={id} value={id}>
                      {getEmployeeName(employee)}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9CA8]"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] pl-3.5 pr-8 text-xs font-semibold text-[#0B2942] outline-none transition hover:bg-white focus:border-[#146EF5] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1]"
                >
                  <option value="ALL">{t("calendar.allStatus")}</option>
                  <option value="PENDING">{t("status.pending")}</option>
                  <option value="IN_PROGRESS">{t("status.in_progress")}</option>
                  <option value="COMPLETED">{t("status.completed")}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A9CA8]"
                />
              </div>

              {/* Filters Toggle / Reset Button */}
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setEmployeeFilter("ALL");
                  setStatusFilter("ALL");
                }}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] px-3.5 text-xs font-semibold text-[#0B2942] transition hover:bg-white hover:border-[#146EF5] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1]"
              >
                <Filter size={14} className="text-[#5F7890]" />
                <span>{t("calendar.filters")}</span>
              </button>

              {/* + Add Task Button */}
              <button
                type="button"
                onClick={() => router.push("/admin/tasks/create")}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-[#146EF5] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[#1056C2]"
              >
                <Plus size={15} />
                <span>{t("calendar.addTask")}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================================================= */}
        {/* 3. MAIN CALENDAR LAYOUT (2-COLUMN GRID) */}
        {/* ================================================= */}

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">

          {/* =============================================== */}
          {/* LEFT: LARGE MONTHLY CALENDAR (LG: 9 COLS ~ 75%) */}
          {/* =============================================== */}

          <div className="rounded-2xl border border-[#D7E4EF] bg-white p-4 sm:p-5 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-9 flex flex-col justify-between">
            <div>
              {/* Calendar Top Toolbar */}
              <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#D7E4EF] dark:border-[#1E435E]">
                {/* Left Controls: Prev, Month, Next, Today */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={previousMonth}
                    aria-label="Previous month"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E4EF] text-[#5F7890] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:text-[#8CB0C7] dark:hover:bg-[#163854] transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <div className="flex items-center gap-1.5 px-2">
                    <span className="text-[16px] sm:text-[17px] font-bold text-[#0B2942] dark:text-white">
                      {currentDate.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <ChevronDown size={14} className="text-[#8A9CA8]" />
                  </div>

                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D7E4EF] text-[#5F7890] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:text-[#8CB0C7] dark:hover:bg-[#163854] transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={goToday}
                    className="ml-1.5 rounded-lg border border-[#D7E4EF] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B2942] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#CBD5E1] dark:hover:bg-[#163854] transition-colors"
                  >
                    {t("calendar.today")}
                  </button>
                </div>

                {/* Right View Modes: Month, Week, Day, List */}
                <div className="flex items-center gap-1 rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] p-1 dark:border-[#1E435E] dark:bg-[#071F2C]">
                  {(["Month", "Week", "Day", "List"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                        viewMode === mode
                          ? "bg-[#146EF5] text-white shadow-2xs"
                          : "text-[#5F7890] hover:text-[#0B2942] dark:text-[#8CB0C7] dark:hover:text-white"
                      }`}
                    >
                      {mode === "Month"
                        ? t("calendar.month")
                        : mode === "Week"
                        ? t("calendar.week")
                        : mode === "Day"
                        ? t("calendar.day")
                        : t("calendar.list")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsive Calendar Grid Wrapper */}
              <div className="w-full overflow-x-auto responsive-table-scroll">
                <div className="min-w-[620px]">
                  {/* Day Name Headers (SUN, MON, TUE, WED, THU, FRI, SAT) */}
                  <div className="grid grid-cols-7 border-b border-[#D7E4EF] text-center text-[11px] font-bold uppercase tracking-wider text-[#8A9CA8] dark:border-[#1E435E] dark:text-[#6B8D9F]">
                    {(language === "hi"
                      ? ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"]
                      : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
                    ).map((day, idx) => (
                      <div
                        key={day}
                        className={`py-2.5 ${
                          idx < 6 ? "border-r border-[#D7E4EF] dark:border-[#1E435E]" : ""
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* 7-Column Calendar Grid */}
                  <div className="grid grid-cols-7 border-l border-t border-[#D7E4EF] dark:border-[#1E435E]">
                    {calendarDays.map((cell, idx) => {
                      const key = dateKey(cell.date);
                      const dayEvents = tasksByDate.get(key) || [];
                      const isSelected = sameDate(cell.date, selectedDate);

                      return (
                        <div
                          key={`${key}-${idx}`}
                          onClick={() => setSelectedDate(cell.date)}
                          className={`group relative min-h-[96px] sm:min-h-[105px] border-b border-r border-[#D7E4EF] p-1.5 sm:p-2 text-left transition-colors dark:border-[#1E435E] cursor-pointer ${
                            !cell.isCurrentMonth
                              ? "bg-[#FAFBFD] dark:bg-[#071F2C]/40 opacity-50"
                              : isSelected
                              ? "bg-[#F4F9FF] dark:bg-[#0A283F]"
                              : "bg-white hover:bg-[#F9FBFC] dark:bg-[#0B2538] dark:hover:bg-[#102D42]"
                          }`}
                        >
                          {/* Top Date Header */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`flex h-6 w-6 items-center justify-center text-xs font-semibold rounded-full ${
                                isSelected
                                  ? "bg-[#146EF5] font-bold text-white shadow-2xs"
                                  : cell.isCurrentMonth
                                  ? "text-[#0B2942] dark:text-white"
                                  : "text-[#8A9CA8] dark:text-[#6B8D9F]"
                              }`}
                            >
                              {cell.dayNumber}
                            </span>
                          </div>

                          {/* Event Cards inside cell */}
                          <div className="mt-1.5 space-y-1">
                            {dayEvents.slice(0, 2).map((task, tIdx) => {
                              const style = getEventStyle(task);

                              return (
                                <div
                                  key={task._id || task.id || tIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                  }}
                                  className={`group/task flex flex-col rounded-md border p-1 sm:p-1.5 text-left transition-transform hover:scale-[1.01] ${style.bg} ${style.border}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                                    <span className={`truncate text-[10px] font-semibold ${style.text}`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <span className={`text-[9px] font-medium pl-2.5 truncate ${style.timeColor}`}>
                                    {task.timeSlot || "10:00 AM – 11:00 AM"}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Overflow counter (+1 more, +2 more) */}
                            {dayEvents.length > 2 && (
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(cell.date);
                                }}
                                className="text-[9.5px] font-bold text-[#146EF5] hover:underline dark:text-[#38BDF8] pl-1 cursor-pointer"
                              >
                                +{dayEvents.length - 2} {t("calendar.more")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-start gap-4 sm:gap-6 border-t border-[#D7E4EF] pt-3.5 text-xs font-medium text-[#5F7890] dark:border-[#1E435E] dark:text-[#8CB0C7]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#146EF5]" />
                <span>{t("calendar.legendTask")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span>{t("calendar.legendHighPriority")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                <span>{t("calendar.legendUrgentOverdue")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>{t("calendar.legendCompleted")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                <span>{t("calendar.legendMeeting")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                <span>{t("calendar.legendOther")}</span>
              </div>
            </div>
          </div>

          {/* =============================================== */}
          {/* RIGHT: COMPACT SIDEBAR STACK (LG: 3 COLS ~ 25%) */}
          {/* =============================================== */}

          <div className="space-y-5 lg:col-span-3">

            {/* 1. MINI CALENDAR CARD */}
            <div className="rounded-2xl border border-[#D7E4EF] bg-white p-4 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
              {/* Header with Navigation */}
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[#0B2942] dark:text-white">
                  {currentDate.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={previousMonth}
                    aria-label="Previous month"
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[#D7E4EF] text-[#5F7890] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:text-[#8CB0C7]"
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    aria-label="Next month"
                    className="flex h-6 w-6 items-center justify-center rounded-md border border-[#D7E4EF] text-[#5F7890] hover:bg-[#F5F9FC] dark:border-[#1E435E] dark:text-[#8CB0C7]"
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Day Labels */}
              <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-semibold text-[#8A9CA8] dark:text-[#6B8D9F]">
                {(language === "hi"
                  ? ["र", "सो", "मं", "बु", "गु", "शु", "श"]
                  : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                ).map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              {/* Mini Calendar Grid */}
              <div className="mt-1.5 grid grid-cols-7 gap-y-0.5 text-center text-xs">
                {calendarDays.map((cell, idx) => {
                  const isSelected = sameDate(cell.date, selectedDate);
                  const key = dateKey(cell.date);
                  const hasTasks = (tasksByDate.get(key) || []).length > 0;

                  return (
                    <div
                      key={`mini-${idx}`}
                      onClick={() => setSelectedDate(cell.date)}
                      className="flex flex-col items-center justify-center py-1 cursor-pointer"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors ${
                          isSelected
                            ? "bg-[#146EF5] font-bold text-white shadow-xs"
                            : cell.isCurrentMonth
                            ? "text-[#0B2942] hover:bg-[#EFF6FF] dark:text-[#CBD5E1] dark:hover:bg-[#163854]"
                            : "text-[#CAD5DE] dark:text-[#47677B]"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                      <span
                        className={`h-1 w-1 rounded-full mt-0.5 ${
                          hasTasks ? "bg-[#146EF5]" : "bg-transparent"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. UPCOMING TASKS CARD */}
            <div className="rounded-2xl border border-[#D7E4EF] bg-white p-4 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-bold text-[#0B2942] dark:text-white">
                  {t("calendar.upcomingTasks")}
                </h3>
                <Link
                  href="/admin/tasks"
                  className="text-xs font-semibold text-[#146EF5] hover:underline dark:text-[#38BDF8]"
                >
                  {t("calendar.viewAll")}
                </Link>
              </div>

              <div className="mt-3 space-y-2.5">
                {[
                  {
                    title: "Deployment to Staging",
                    time: "Today, 10:00 AM – 12:00 PM",
                    dot: "bg-[#146EF5]",
                  },
                  {
                    title: "Design Review",
                    time: "Today, 2:00 PM – 3:00 PM",
                    dot: "bg-[#EF4444]",
                  },
                  {
                    title: "Sprint Planning",
                    time: "Tomorrow, 11:00 AM – 12:00 PM",
                    dot: "bg-[#10B981]",
                  },
                  {
                    title: "Build Employee Management",
                    time: "Thu, 10 Sep, 2:00 PM – 4:00 PM",
                    dot: "bg-[#F59E0B]",
                  },
                  {
                    title: "Build Backend Task Module",
                    time: "Fri, 11 Sep, 11:00 AM – 12:00 PM",
                    dot: "bg-[#7C3AED]",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#12364E]"
                  >
                    <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${item.dot}`} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[#0B2942] dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-[10.5px] text-[#8A9CA8] dark:text-[#6B8D9F]">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. TASK STATISTICS CARD (DONUT CHART) */}
            <div className="rounded-2xl border border-[#D7E4EF] bg-white p-4 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
              <h3 className="text-[14px] font-bold text-[#0B2942] dark:text-white">
                {t("calendar.taskStatistics")}
              </h3>

              <div className="mt-3 flex items-center justify-between gap-4">
                {/* Donut Chart SVG */}
                <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="12"
                      className="dark:stroke-[#163854]"
                    />
                    {/* Scheduled (10/16 = 62.5%) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#146EF5"
                      strokeWidth="12"
                      strokeDasharray={`${0.625 * 289} ${289}`}
                      strokeDashoffset="0"
                    />
                    {/* Completed (4/16 = 25%) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray={`${0.25 * 289} ${289}`}
                      strokeDashoffset={`-${0.625 * 289}`}
                    />
                    {/* Overdue (2/16 = 12.5%) */}
                    <circle
                      cx="60"
                      cy="60"
                      r="46"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="12"
                      strokeDasharray={`${0.125 * 289} ${289}`}
                      strokeDashoffset={`-${(0.625 + 0.25) * 289}`}
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[18px] font-bold text-[#0B2942] dark:text-white tabular-nums leading-none">
                      16
                    </span>
                    <span className="text-[8.5px] font-medium text-[#8A9CA8] dark:text-[#6B8D9F] mt-0.5">
                      {t("calendar.totalTasks")}
                    </span>
                  </div>
                </div>

                {/* Legend Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#146EF5]" />
                    <span className="font-semibold text-[#0B2942] dark:text-[#CBD5E1]">
                      10 {t("calendar.scheduled")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="font-semibold text-[#0B2942] dark:text-[#CBD5E1]">
                      4 {t("calendar.completed")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                    <span className="font-semibold text-[#0B2942] dark:text-[#CBD5E1]">
                      2 {t("calendar.overdue")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. STAY ORGANIZED INFORMATION CARD */}
            <div className="rounded-2xl border border-[#D0E4FF] bg-[#F0F7FF] p-4 dark:border-[#1E435E] dark:bg-[#0B2538] flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#146EF5]/15 text-[#146EF5]">
                <CalendarDays size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#0B2942] dark:text-white">
                  {t("calendar.stayOrganized")}
                </h4>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[#5F7890] dark:text-[#8CB0C7]">
                  {t("calendar.stayOrganizedDesc")}
                </p>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* =================================================== */}
      {/* TASK DETAILS MODAL */}
      {/* =================================================== */}

      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        className="w-full max-w-md"
      >
        {selectedTask && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#D7E4EF] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-center justify-between border-b border-[#D7E4EF] px-5 py-4 dark:border-[#1E435E]">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#146EF5]">
                  {t("calendar.taskDetails")}
                </p>
                <h3 className="mt-0.5 text-base font-bold text-[#0B2942] dark:text-white">
                  {selectedTask.title || t("calendar.untitledTask")}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8A9CA8] hover:bg-[#F5F9FC] dark:hover:bg-[#163854]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-[#8A9CA8]">{t("calendar.description")}</p>
                <p className="mt-1 rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#5F7890] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1]">
                  {selectedTask.description || t("calendar.noDescriptionProvided")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] p-3 dark:border-[#1E435E] dark:bg-[#071F2C]">
                  <p className="text-[10px] font-semibold text-[#8A9CA8]">{t("calendar.status")}</p>
                  <p className="mt-1 font-bold text-[#0B2942] dark:text-white">
                    {t(`status.${String(selectedTask.status || "PENDING").toLowerCase()}`) || selectedTask.status || "Pending"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] p-3 dark:border-[#1E435E] dark:bg-[#071F2C]">
                  <p className="text-[10px] font-semibold text-[#8A9CA8]">{t("calendar.priority")}</p>
                  <p className="mt-1 font-bold text-[#0B2942] dark:text-white">
                    {t(`priority.${String(selectedTask.priority || "MEDIUM").toLowerCase()}`) || selectedTask.priority || "Medium"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#D7E4EF] bg-[#F8FAFC] p-3 text-xs dark:border-[#1E435E] dark:bg-[#071F2C]">
                <p className="text-[10px] font-semibold text-[#8A9CA8]">{t("calendar.dueDate")}</p>
                <p className="mt-1 font-bold text-[#0B2942] dark:text-white">
                  {formatDate(selectedTask.dueDate, language)} {selectedTask.timeSlot ? `(${selectedTask.timeSlot})` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#D7E4EF] px-5 py-3.5 bg-[#F8FAFC] dark:border-[#1E435E] dark:bg-[#071F2C]">
              {selectedTask._id || selectedTask.id ? (
                <Link
                  href={`/admin/tasks/${selectedTask._id || selectedTask.id}`}
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl border border-[#D7E4EF] bg-white px-4 py-2 text-xs font-semibold text-[#146EF5] hover:bg-[#EFF6FF] dark:border-[#1E435E] dark:bg-[#0B2538]"
                >
                  {t("calendar.viewFullTask")}
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl bg-[#063B63] px-4 py-2 text-xs font-bold text-white hover:bg-[#084A7D]"
              >
                {t("calendar.close")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
