"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { RecentTaskItem } from "../types";

interface UpcomingTasksProps {
  tasks: RecentTaskItem[];
}

interface PrioritizedTask extends RecentTaskItem {
  isOverdue: boolean;
  isToday: boolean;
  formattedDue: string;
  assigneeName: string;
  assigneeInitials: string;
}

export default function UpcomingTasks({ tasks }: UpcomingTasksProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  const prioritizedList: PrioritizedTask[] = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const tomorrowEnd = todayEnd + 86400000;

    const priorityWeight: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    // Separate into active vs completed tasks
    const activeTasks = tasks.filter(
      (t) => String(t.status || "").toUpperCase() !== "COMPLETED"
    );

    // Source pool: prioritize active tasks, fallback to all tasks if needed
    const pool = activeTasks.length > 0 ? activeTasks : tasks;

    const enriched: PrioritizedTask[] = pool.map((task) => {
      const d = task.dueDate ? new Date(task.dueDate) : null;
      const dTime = d && !isNaN(d.getTime()) ? d.getTime() : Infinity;
      const isCompleted = String(task.status || "").toUpperCase() === "COMPLETED";

      const isOverdue = !isCompleted && dTime < todayStart;
      const isToday = !isCompleted && dTime >= todayStart && dTime <= todayEnd;
      const isTomorrow = !isCompleted && dTime > todayEnd && dTime <= tomorrowEnd;

      let formattedDue = language === "hi" ? "कोई तिथि नहीं" : "No date";
      if (d && !isNaN(d.getTime())) {
        if (isOverdue) {
          const daysDiff = Math.max(1, Math.round((todayStart - dTime) / 86400000));
          formattedDue = language === "hi" ? `${daysDiff} दिन अतिदेय` : `${daysDiff}d overdue`;
        } else if (isToday) {
          formattedDue = t("common.dueToday") || "Due today";
        } else if (isTomorrow) {
          formattedDue = t("common.dueTomorrow") || "Tomorrow";
        } else {
          formattedDue = d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", {
            day: "2-digit",
            month: "short",
          });
        }
      }

      // Assignee derivation
      let assigneeName = t("tasks.unassigned") || "Unassigned";
      let assigneeInitials = "—";
      if (typeof task.assignedTo === "object" && task.assignedTo !== null) {
        const first = (task.assignedTo as any).firstName || "";
        const last = (task.assignedTo as any).lastName || "";
        assigneeName = `${first} ${last}`.trim() || (task.assignedTo as any).email?.split("@")[0] || t("common.employee") || "Team Member";
        assigneeInitials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || assigneeName.charAt(0).toUpperCase();
      } else if (typeof task.assignedTo === "string" && task.assignedTo.trim()) {
        assigneeName = t("common.employee") || "Team Member";
        assigneeInitials = "TM";
      }

      return {
        ...task,
        isOverdue,
        isToday,
        formattedDue,
        assigneeName,
        assigneeInitials,
      };
    });

    // Sort according to priority:
    // 1. Overdue tasks first
    // 2. Tasks due today
    // 3. High-priority upcoming tasks
    // 4. Upcoming deadlines (due date ascending)
    return enriched.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;

      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;

      const aPriority = priorityWeight[String(a.priority || "").toUpperCase()] || 0;
      const bPriority = priorityWeight[String(b.priority || "").toUpperCase()] || 0;

      // Higher priority first
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      // Earliest due date first
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aTime - bTime;
    }).slice(0, 6);
  }, [tasks]);

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-7 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
              {language === "hi" ? "अनुसूची और प्राथमिकताएं" : "SCHEDULE & PRIORITIES"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {language === "hi" ? "आगामी और प्राथमिकता वाले कार्य" : "Upcoming & Priority Tasks"}
            </h3>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi"
                ? "महत्वपूर्ण समय सीमाएं, आज देय कार्य और तात्कालिक परिणाम।"
                : "Critical deadlines, operational tasks due today, and imminent deliverables."}
            </p>
          </div>

          <Link
            href="/admin/tasks"
            className="inline-flex items-center gap-1 text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] shrink-0"
          >
            {t("dashboard.viewAll") || "View all"} →
          </Link>
        </div>

        {/* Task Items List */}
        {prioritizedList.length === 0 ? (
          <div className="my-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] dark:bg-[#123C46] dark:text-[#38BDF8]">
              <CheckCircle2 size={20} />
            </div>
            <p className="mt-3 text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
              {language === "hi" ? "किसी प्राथमिकता वाले कार्य पर ध्यान देने की आवश्यकता नहीं है" : "No priority tasks require attention"}
            </p>
            <p className="mt-1 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi" ? "सभी सौंपे गए टीम कार्य समय पर चल रहे हैं।" : "All assigned team tasks are progressing on track."}
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#F1F5F9] dark:divide-[#163854]">
            {prioritizedList.map((task, idx) => {
              const taskId = task._id || task.id || String(idx);
              const statusUpper = String(task.status || "PENDING").toUpperCase();
              const priorityUpper = String(task.priority || "MEDIUM").toUpperCase();

              // Status styles
              let statusClass = "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] dark:bg-[#78350F]/30 dark:text-[#FCD34D]";
              let statusLabel = t("status.pending") || "Pending";
              if (statusUpper === "COMPLETED") {
                statusClass = "bg-[#ECFDF5] text-[#00A878] border border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#34D399]";
                statusLabel = t("status.completed") || "Completed";
              } else if (statusUpper === "IN_PROGRESS") {
                statusClass = "bg-[#063B61]/10 text-[#0F172A] border border-[#063B61]/20 dark:bg-[#163854] dark:text-[#60A5FA]";
                statusLabel = t("status.in_progress") || "In Progress";
              }

              // Priority styles
              let priorityClass = "bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] dark:bg-[#163854] dark:text-[#94A3B8]";
              let priorityLabel = t("priority.medium") || "Medium";
              if (priorityUpper === "URGENT") {
                priorityClass = "bg-[#FEF2F2] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#7F1D1D]/40 dark:text-[#F87171]";
                priorityLabel = t("priority.urgent") || "Urgent";
              } else if (priorityUpper === "HIGH") {
                priorityClass = "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] dark:bg-[#7C2D12]/30 dark:text-[#FB923C]";
                priorityLabel = t("priority.high") || "High";
              } else if (priorityUpper === "LOW") {
                priorityClass = "bg-[#ECFDF5] text-[#00A878] border border-[#A7F3D0] dark:bg-[#14532D]/30 dark:text-[#86EFAC]";
                priorityLabel = t("priority.low") || "Low";
              }

              return (
                <div
                  key={taskId}
                  onClick={() => router.push(`/admin/tasks/${taskId}`)}
                  className="group flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#12364E] rounded-lg px-2 cursor-pointer"
                >
                  {/* Left: Indicator + Title + Assignee */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Urgency Icon indicator */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ${
                        task.isOverdue
                          ? "bg-[#FEF2F2] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#7F1D1D]/40 dark:text-[#F87171]"
                          : task.isToday
                          ? "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] dark:bg-[#78350F]/40 dark:text-[#FCD34D]"
                          : priorityUpper === "URGENT" || priorityUpper === "HIGH"
                          ? "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] dark:bg-[#7C2D12]/30 dark:text-[#FB923C]"
                          : "bg-[#00A6C7]/10 text-[#00A6C7] border border-[#00A6C7]/20 dark:bg-[#123C46] dark:text-[#38BDF8]"
                      }`}
                    >
                      {task.isOverdue ? (
                        <AlertTriangle size={15} />
                      ) : task.isToday ? (
                        <Clock size={15} />
                      ) : priorityUpper === "URGENT" ? (
                        <Flame size={15} />
                      ) : (
                        <Calendar size={15} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#0F172A] group-hover:text-[#1D4ED8] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors leading-[18px]">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 text-[12px] font-normal text-[#64748B] dark:text-[#94A3B8] truncate">
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 dark:bg-[#1E435E] text-[8.5px] font-semibold text-[#0F172A] dark:text-[#CBD5E1]">
                            {task.assigneeInitials}
                          </span>
                          {task.assigneeName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Due Indicator */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Priority Badge */}
                    <span
                      className={`hidden sm:inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-[16px] ${priorityClass}`}
                    >
                      {priorityLabel}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-[16px] ${statusClass}`}
                    >
                      {statusLabel}
                    </span>

                    {/* Due Date Indicator */}
                    <span
                      className={`text-[12px] font-medium leading-[17px] tabular-nums min-w-[76px] text-right ${
                        task.isOverdue
                          ? "text-[#E5484D] dark:text-[#F87171]"
                          : task.isToday
                          ? "text-[#D97706] dark:text-[#FCD34D]"
                          : "text-[#64748B] dark:text-[#94A3B8]"
                      }`}
                    >
                      {task.formattedDue}
                    </span>

                    <ChevronRight
                      size={14}
                      className="text-[#94A3B8] transition-transform group-hover:text-[#00A6C7] group-hover:translate-x-0.5 hidden sm:block"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] dark:border-[#1E435E] flex items-center justify-between text-xs">
        <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
          {language === "hi" ? "समय सीमा और तात्कालिकता के आधार पर प्राथमिकता दी गई" : "Prioritized by deadline & urgency"}
        </span>
        <Link
          href="/admin/tasks"
          className="text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8]"
        >
          {language === "hi" ? "सभी कार्य प्रबंधित करें →" : "Manage all tasks →"}
        </Link>
      </div>
    </div>
  );
}
