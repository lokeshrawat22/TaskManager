"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { RecentTaskItem } from "../types";

interface AdminNeedsAttentionProps {
  overdueCount: number;
  tasks?: RecentTaskItem[];
}

export default function AdminNeedsAttention({
  overdueCount,
  tasks = [],
}: AdminNeedsAttentionProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  // Derive upcoming deadlines and unassigned tasks from live data model
  const { upcomingDeadlinesCount, unassignedCount } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const threeDaysLater = todayStart + 3 * 86400000;

    let deadlines = 0;
    let unassigned = 0;

    tasks.forEach((task) => {
      const isCompleted = String(task.status || "").toUpperCase() === "COMPLETED";
      if (isCompleted) return;

      if (!task.assignedTo) {
        unassigned += 1;
      }

      if (task.dueDate) {
        const d = new Date(task.dueDate).getTime();
        if (!isNaN(d) && d >= todayStart && d <= threeDaysLater) {
          deadlines += 1;
        }
      }
    });

    return {
      upcomingDeadlinesCount: deadlines,
      unassignedCount: unassigned,
    };
  }, [tasks]);

  const hasIssues = overdueCount > 0 || upcomingDeadlinesCount > 0 || unassignedCount > 0;

  if (hasIssues) {
    return (
      <section className="rounded-[14px] border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FEF2F2] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#4C121A] dark:text-[#F87171]">
              <AlertTriangle size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#4C121A] dark:text-[#FCA5A5]">
                  {t("dashboard.actionRequired") || "ACTION REQUIRED"}
                </span>

                {overdueCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold leading-[17px] text-[#E5484D] dark:text-[#FCA5A5]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E5484D]" />
                    {language === "hi"
                      ? `${overdueCount} अतिदेय कार्य`
                      : `${overdueCount} ${overdueCount === 1 ? "Overdue Task" : "Overdue Tasks"}`}
                  </span>
                )}

                {upcomingDeadlinesCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#D97706] dark:text-[#FCD34D]">
                    <Clock size={12} />
                    {language === "hi" ? `${upcomingDeadlinesCount} शीघ्र देय (3 दिन)` : `${upcomingDeadlinesCount} Due Soon (3 days)`}
                  </span>
                )}

                {unassignedCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#8CB0C7]">
                    <UserX size={12} />
                    {language === "hi" ? `${unassignedCount} असाइन नहीं किए गए` : `${unassignedCount} Unassigned`}
                  </span>
                )}
              </div>

              <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-[#FCA5A5]">
                {overdueCount > 0
                  ? language === "hi"
                    ? `${overdueCount} अतिदेय कार्यों पर तत्काल ध्यान देने की आवश्यकता है`
                    : `${overdueCount} overdue ${overdueCount === 1 ? "deliverable requires" : "deliverables require"} immediate attention`
                  : language === "hi"
                    ? `${upcomingDeadlinesCount} आगामी समय सीमाएं निकट आ रही हैं`
                    : `${upcomingDeadlinesCount} upcoming deadlines approaching`}
              </h4>
              <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#F87171] mt-0.5">
                {language === "hi"
                  ? "समय सीमा चूकने से रोकने के लिए सक्रिय कार्यों की समीक्षा करें और संबंधित कर्मियों से संपर्क करें।"
                  : "Review active deliverables to prevent missed delivery milestones and follow up with assignees."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {overdueCount > 0 ? (
              <button
                type="button"
                onClick={() => router.push("/admin/tasks?status=OVERDUE")}
                className="flex items-center justify-center gap-1.5 rounded-[9px] bg-[#E5484D] hover:bg-[#D13C41] px-4 py-2 text-[13px] font-semibold leading-[18px] text-white transition-colors cursor-pointer shadow-2xs"
              >
                {language === "hi" ? "अतिदेय कार्यों की समीक्षा करें" : "Review Overdue Tasks"} <ArrowUpRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/admin/tasks")}
                className="flex items-center justify-center gap-1.5 rounded-[9px] bg-[#00A6C7] hover:bg-[#087D8F] px-4 py-2 text-[13px] font-semibold leading-[18px] text-white transition-colors cursor-pointer shadow-2xs"
              >
                {language === "hi" ? "आगामी समय सीमाओं की समीक्षा करें" : "Review Upcoming Deadlines"} <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // All clear positive state
  return (
    <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs dark:border-[#065F46] dark:bg-[#064E3B]/20">
      <div className="flex items-center gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#ECFDF5] text-[#00A878] border border-[#DCFCE7] dark:bg-[#064E3B]/60 dark:text-[#34D399]">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#00A878] border border-[#DCFCE7] dark:bg-[#065F46]/50 dark:text-[#A7F3D0] mb-1">
            {language === "hi" ? "सब ठीक है" : "ALL CLEAR"}
          </div>
          <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-[#34D399]">
            {language === "hi"
              ? "किसी अतिदेय कार्य या तात्कालिक समय सीमा पर ध्यान देने की आवश्यकता नहीं है"
              : "No overdue tasks or urgent deadlines require attention"}
          </h4>
          <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#A7F3D0]/80 mt-0.5">
            {t("dashboard.allDeliverablesOnSchedule") || "All organizational deliverables are progressing on schedule without critical delays."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/admin/tasks")}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 py-2 text-[13px] font-semibold leading-[18px] text-[#0F172A] transition-colors cursor-pointer dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
      >
        {t("dashboard.viewAllTasks") || "View all tasks"} <ArrowUpRight size={14} />
      </button>
    </section>
  );
}
