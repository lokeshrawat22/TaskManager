"use client";

import { useMemo } from "react";
import { Plus, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

interface WelcomeBannerProps {
  firstName: string;
  activeEmployees?: number;
  totalTasks?: number;
  overdueTasks?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function WelcomeBanner({
  firstName,
  overdueTasks = 2,
  onRefresh,
  isRefreshing = false,
}: WelcomeBannerProps) {
  const { t, language } = useLanguage();

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [language]);

  // Dynamic time-based greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return t("dashboard.goodMorning") || "Good morning";
    }
    if (hour >= 12 && hour < 17) {
      return t("dashboard.goodAfternoon") || "Good afternoon";
    }
    if (hour >= 17 && hour < 21) {
      return t("dashboard.goodEvening") || "Good evening";
    }
    return t("dashboard.goodNight") || "Good night";
  }, [t]);

  return (
    <section className="relative rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* =================================================
            LEFT: Clean Executive Welcome Section
        ================================================= */}
        <div className="max-w-2xl min-w-0">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#F1F5F9] border border-[#CBD5E1] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#334155] dark:bg-[#123C46]/60 dark:border-[#1A5260] dark:text-[#4CD2DA] mb-2">
            <span>{t("adminControlCenter") || "ADMIN CONTROL CENTER"}</span>
            <span className="text-slate-400 dark:text-[#4CD2DA]/40">•</span>
            <span>{t("fullOrganizationAccess") || "FULL ORGANIZATION ACCESS"}</span>
          </div>

          <h1 className="text-[26px] sm:text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {greetingText}, {firstName}
          </h1>

          <p className="mt-1 text-[13px] font-normal leading-[20px] text-[#64748B] dark:text-[#94A3B8]">
            {t("dashboard.heroDescription") || "Real-time workforce performance, task distribution and operational health."}
          </p>
        </div>

        {/* =================================================
            RIGHT: Compact Date, Status Pill & Action Buttons
        ================================================= */}
        <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
          <div className="flex flex-col items-start md:items-end leading-tight">
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#475569] dark:text-[#CBD5E1]">
              <span className="h-2 w-2 rounded-full bg-[#00A878]" />
              <span>{currentDateFormatted}</span>
            </div>

            {overdueTasks > 0 ? (
              <Link
                href="/admin/tasks?status=OVERDUE"
                className="mt-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 transition-colors cursor-pointer"
                title="Click to view overdue tasks"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                <span>
                  {overdueTasks === 1
                    ? t("dashboard.taskRequiresAttention") || "1 task requires attention →"
                    : t("dashboard.tasksRequireAttention", { count: overdueTasks }) || `${overdueTasks} tasks require attention →`}
                </span>
              </Link>
            ) : (
              <p className="mt-1 text-[12px] font-medium text-[#00A878] dark:text-emerald-400">
                {t("dashboard.allDeliverablesOnSchedule") || "All deliverables on schedule"}
              </p>
            )}
          </div>

          {/* Action Buttons: Outlined Sync + Primary Brand Teal New Task */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={t("dashboard.sync") || "Sync live data"}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-medium leading-none text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors shadow-2xs cursor-pointer dark:border-[#1E435E] dark:bg-[#102A38] dark:text-[#E5F1F5] dark:hover:bg-[#163854]"
              >
                <RefreshCw
                  size={14}
                  className={`text-[#1D4ED8] ${isRefreshing ? "animate-spin" : ""}`}
                />
                <span>{isRefreshing ? (t("dashboard.syncing") || "Syncing...") : (t("dashboard.sync") || "Sync")}</span>
              </button>
            )}

            <Link
              href="/admin/tasks/create"
              className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 text-[13px] font-semibold leading-none text-white hover:bg-[#1E40AF] transition-colors shadow-xs cursor-pointer"
            >
              <Plus size={15} strokeWidth={2.4} />
              <span>{t("dashboard.newTask") || "New Task"}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
