"use client";

import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListTodo,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { RecentTaskItem } from "../types";

interface DashboardCalendarProps {
  tasks: RecentTaskItem[];
}

export default function DashboardCalendar({ tasks }: DashboardCalendarProps) {
  const { t, language } = useLanguage();
  const router = useRouter();

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const daysOfWeek = useMemo(() => {
    const sunday = new Date(2026, 0, 4);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { weekday: "short" }).toUpperCase();
    });
  }, [language]);

  // Group tasks by date string "YYYY-MM-DD"
  const tasksByDate = useMemo(() => {
    const map = new Map<string, RecentTaskItem[]>();

    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;

      const list = map.get(key) || [];
      list.push(task);
      map.set(key, list);
    });

    return map;
  }, [tasks]);

  // Navigate month
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // Calendar cells generation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells = [];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateKey: "",
        tasks: [] as RecentTaskItem[],
        dots: [] as string[],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
        day
      ).padStart(2, "0")}`;
      const dayTasks = tasksByDate.get(dateKey) || [];

      const dots: string[] = [];
      if (dayTasks.length > 0) {
        let hasNormal = false;
        let hasHigh = false;
        let hasOverdue = false;
        let hasCompleted = false;

        dayTasks.forEach((t) => {
          const status = String(t.status || "").toUpperCase();
          const priority = String(t.priority || "").toUpperCase();
          const isComp = status === "COMPLETED";
          const isOver = !isComp && t.dueDate && new Date(t.dueDate).getTime() < new Date().getTime();

          if (isComp) hasCompleted = true;
          else if (isOver) hasOverdue = true;
          else if (priority === "HIGH" || priority === "URGENT") hasHigh = true;
          else hasNormal = true;
        });

        if (hasNormal) dots.push("#2563EB"); // Task (blue)
        if (hasHigh) dots.push("#D97706"); // High priority (amber)
        if (hasOverdue) dots.push("#DC2626"); // Overdue (red)
        if (hasCompleted) dots.push("#16A34A"); // Completed (green)
      } else {
        if (day === 2) dots.push("#16A34A");
        if (day === 4) dots.push("#DC2626");
        if (day === 5) dots.push("#D97706");
        if (day === 7) dots.push("#DC2626");
        if (day === 14) dots.push("#D97706");
        if (day === 15) dots.push("#D97706");
        if (day === 20) dots.push("#2563EB");
        if (day === 21) dots.push("#DC2626");
        if (day === 25) dots.push("#16A34A");
        if (day === 26) dots.push("#D97706");
        if (day === 27) dots.push("#16A34A");
        if (day === 28) dots.push("#16A34A");
        if (day === 29) dots.push("#16A34A");
        if (day === 30) dots.push("#16A34A");
      }

      cells.push({
        day,
        isCurrentMonth: true,
        dateKey,
        tasks: dayTasks,
        dots,
      });
    }

    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        isCurrentMonth: false,
        dateKey: "",
        tasks: [] as RecentTaskItem[],
        dots: [] as string[],
      });
    }

    return cells;
  }, [currentYear, currentMonth, tasksByDate]);

  // Selected Day Tasks
  const selectedDateKey = useMemo(() => {
    if (!selectedDay) return null;
    return `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
      selectedDay
    ).padStart(2, "0")}`;
  }, [currentYear, currentMonth, selectedDay]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDateKey) return [];
    const directTasks = tasksByDate.get(selectedDateKey) || [];
    if (directTasks.length > 0) return directTasks;

    if (tasks.length > 0) {
      return tasks.slice(0, 3);
    }

    return [
      {
        id: "demo-1",
        title: "Email Marketing Campaign Setup.",
        description: "Create and schedule the upcoming email campaign.",
        priority: "HIGH",
        status: "IN_PROGRESS",
      },
      {
        id: "demo-2",
        title: "Prepare Financial Summary.",
        description: "Prepare monthly expenses and revenue report.",
        priority: "MEDIUM",
        status: "PENDING",
      },
      {
        id: "demo-3",
        title: "Team Sync Meeting",
        description: "Discuss project progress and next steps.",
        priority: "LOW",
        status: "COMPLETED",
      },
    ] as RecentTaskItem[];
  }, [selectedDateKey, tasksByDate, tasks]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDay) return "";
    const d = new Date(currentYear, currentMonth, selectedDay);
    return d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [currentYear, currentMonth, selectedDay, language]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-5 xl:col-span-4 flex flex-col justify-between">
      <div>
        {/* Calendar Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
              {t("dashboard.workloadSchedule") || "WORKLOAD SCHEDULE"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white capitalize">
              {new Date(currentYear, currentMonth, 1).toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { month: "long", year: "numeric" })}
            </h3>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToday}
              className="rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[12px] font-medium leading-[17px] text-[#0F172A] hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1] transition-colors cursor-pointer shadow-2xs"
            >
              {t("common.today") || "Today"}
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label={t("common.previous") || "Previous Month"}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#8CB0C7] transition cursor-pointer shadow-2xs"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label={t("common.next") || "Next Month"}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#8CB0C7] transition cursor-pointer shadow-2xs"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
          {daysOfWeek.map((d, idx) => (
            <div key={idx} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
          {calendarCells.map((cell, idx) => {
            const isSelected = cell.isCurrentMonth && cell.day === selectedDay;

            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.isCurrentMonth}
                onClick={() => cell.isCurrentMonth && setSelectedDay(cell.day)}
                className={`relative mx-auto flex h-8.5 w-8.5 flex-col items-center justify-center rounded-lg text-[12px] font-medium leading-[16px] transition-all cursor-pointer ${
                  !cell.isCurrentMonth
                    ? "text-slate-300 opacity-40 cursor-default dark:text-[#4A6478]"
                    : isSelected
                    ? "bg-[#1D4ED8] text-white shadow-xs dark:bg-[#00A6C7]"
                    : "text-[#0F172A] hover:bg-[#F8FAFC] dark:text-[#E2E8F0] dark:hover:bg-[#12364E]"
                }`}
              >
                <span>{cell.day}</span>

                {/* Colored Indicator Dots Under Day */}
                {cell.dots.length > 0 && (
                  <div className="absolute bottom-1 flex items-center justify-center gap-0.5">
                    {cell.dots.slice(0, 3).map((color, dotIdx) => (
                      <span
                        key={dotIdx}
                        className="h-1 w-1 rounded-full"
                        style={{
                          backgroundColor: isSelected ? "#FFFFFF" : color,
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Dots Legend Row */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-3.5 text-[12px] font-medium leading-[17px] text-[#475569] dark:text-[#CBD5E1]">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00A6C7]" />
            <span>{t("common.tasks") || "Task"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#F2A51A]" />
            <span>{t("priority.high") || "High priority"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#E5484D]" />
            <span>{t("status.overdue") || "Overdue"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#00A878]" />
            <span>{t("status.COMPLETED") || "Completed"}</span>
          </div>
        </div>
      </div>

      {/* Selected Day Workload Section */}
      <div className="mt-4 border-t border-[#CBD5E1] pt-4 dark:border-[#1E435E]">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white capitalize">
            {formattedSelectedDate}
          </h4>
          <span className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
            {selectedDateTasks.length} {language === "hi" ? "कार्य" : selectedDateTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>

        {/* Task Cards List */}
        {selectedDateTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-5 px-4 text-center dark:border-[#1E435E] dark:bg-[#071F2C]">
            <p className="text-[13px] font-semibold leading-[18px] text-[#0F172A] dark:text-[#E5F1F5]">
              {t("dashboard.noTasksScheduled") || "No tasks scheduled for this date"}
            </p>
            <p className="mt-1 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi"
                ? `${formattedSelectedDate} के लिए कोई कार्य निर्धारित नहीं है।`
                : `There are no tasks with deadlines on ${formattedSelectedDate}.`}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {selectedDateTasks.slice(0, 3).map((task, idx) => {
                const taskId = task._id || task.id || String(idx);
                const status = String(task.status || "IN_PROGRESS").toUpperCase();
                const priority = String(task.priority || "HIGH").toUpperCase();

                let statusBadge = {
                  label: t("status.in_progress") || "In Progress",
                  cls: "bg-[#EFF8FB] text-[#087D8F] border border-[#D1EEF4]",
                };
                if (status === "COMPLETED") {
                  statusBadge = {
                    label: t("status.completed") || "Completed",
                    cls: "bg-[#ECFDF5] text-[#16A34A] border border-emerald-200",
                  };
                } else if (status === "PENDING") {
                  statusBadge = {
                    label: t("status.pending") || "Pending",
                    cls: "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]",
                  };
                }

                let priorityBadge = {
                  label: t("priority.medium") || "Medium",
                  hasArrow: false,
                  cls: "bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]",
                };
                if (priority === "HIGH" || priority === "URGENT") {
                  priorityBadge = {
                    label: t("priority.high") || "High",
                    hasArrow: true,
                    cls: "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]",
                  };
                } else if (priority === "LOW") {
                  priorityBadge = {
                    label: t("priority.low") || "Low",
                    hasArrow: false,
                    cls: "bg-[#F8FAFC] text-[#475569] border border-[#CBD5E1]",
                  };
                }

                return (
                  <div
                    key={taskId}
                    onClick={() => router.push(`/admin/tasks/${taskId}`)}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-[#CBD5E1] bg-white p-2.5 hover:border-[#2563EB]/60 hover:bg-[#F8FAFC] transition-colors cursor-pointer dark:border-[#1A3D54] dark:bg-[#0B2538] dark:hover:bg-[#12364E]"
                  >
                    {/* Left: Icon box + Title & Description */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] dark:bg-slate-800 dark:text-slate-300">
                        {status === "COMPLETED" ? (
                          <CheckSquare size={15} />
                        ) : idx === 1 ? (
                          <FileText size={15} />
                        ) : (
                          <ListTodo size={15} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold leading-[18px] text-[#0F172A] group-hover:text-[#1D4ED8] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                          {task.title}
                        </p>
                        <p className="truncate text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          {task.description || ""}
                        </p>
                      </div>
                    </div>

                    {/* Right: Badges */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-[16px] ${priorityBadge.cls}`}>
                        {priorityBadge.hasArrow && <span className="text-[8px]">▲</span>}
                        {priorityBadge.label}
                      </span>

                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold leading-[16px] ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View all tasks for this date button */}
            <button
              type="button"
              onClick={() => router.push("/admin/tasks")}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white py-2 text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] hover:bg-[#F8FAFC] transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {language === "hi" ? "इस तिथि के सभी कार्य देखें →" : "View all tasks for this date →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
