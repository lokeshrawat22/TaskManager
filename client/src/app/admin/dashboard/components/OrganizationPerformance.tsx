"use client";

import { ArrowUpRight, CheckCircle2, Clock3, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { TrendItem } from "../types";

interface OrganizationPerformanceProps {
  completionRate: number;
  completedTasks?: number;
  totalTasks?: number;
  overdueTasks?: number;
  trend?: TrendItem;
  period?: string;
}

export default function OrganizationPerformance({
  completionRate,
  completedTasks = 0,
  totalTasks = 0,
  overdueTasks = 0,
  trend,
}: OrganizationPerformanceProps) {
  const { t, language } = useLanguage();
  const remainingTasks = Math.max(0, totalTasks - completedTasks);

  // Real calculated on-time rate (percentage of non-overdue deliverables)
  const onTimeRate = useMemo(() => {
    if (totalTasks === 0) return 100;
    const onTimeCount = Math.max(0, totalTasks - overdueTasks);
    return Math.round((onTimeCount / totalTasks) * 100);
  }, [totalTasks, overdueTasks]);

  const hasTrend = Boolean(trend && trend.value && trend.value !== "—");

  return (
    <div className="rounded-xl border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-5 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#334155] dark:text-[#94A3B8]">
              {t("dashboard.organizationPerformance") || "ORGANIZATION PERFORMANCE"}
            </p>
            <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.overallCompletionEfficiency") || "Overall completion efficiency"}
            </h2>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {t("dashboard.orgPerformanceSubtitle") || "Real-time delivery progress across the entire workspace."}
            </p>
          </div>
        </div>

        {/* Main Metric Area: Prominent Completion Rate */}
        <div className="mt-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 dark:border-[#1E435E] dark:bg-[#071F2C]">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[32px] font-bold leading-[38px] tracking-[-0.02em] text-[#0F172A] dark:text-white tabular-nums">
                {completionRate}%
              </span>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                {t("dashboard.completionRate") || "COMPLETION RATE"}
              </p>
            </div>

            {hasTrend && trend && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none ${
                  trend.isDown
                    ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400"
                    : "bg-[#ECFDF5] text-[#16A34A] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400"
                }`}
              >
                <TrendingUp size={12} className={trend.isDown ? "rotate-180" : ""} />
                <span>{trend.value}</span>
              </span>
            )}
          </div>

          {/* Subtle Progress Bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#163854]">
            <div
              className="h-full rounded-full bg-[#16A34A] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }}
            />
          </div>
        </div>

        {/* Compact 2x2 Metric Grid: White boxes with high-contrast borders */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          {/* Tile 1: Completed */}
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 h-[80px] flex flex-col justify-between dark:border-[#1E435E] dark:bg-[#0B2538] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                {t("dashboard.completed") || "Completed"}
              </span>
              <CheckCircle2 size={16} className="text-[#16A34A]" />
            </div>
            <span className="text-[20px] font-bold leading-none text-[#0F172A] dark:text-white tabular-nums tracking-tight block">
              {completedTasks}
            </span>
          </div>

          {/* Tile 2: Remaining */}
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 h-[80px] flex flex-col justify-between dark:border-[#1E435E] dark:bg-[#0B2538] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                {t("dashboard.remaining") || "Remaining"}
              </span>
              <Clock3 size={16} className="text-slate-500" />
            </div>
            <span className="text-[20px] font-bold leading-none text-[#0F172A] dark:text-white tabular-nums tracking-tight block">
              {remainingTasks}
            </span>
          </div>

          {/* Tile 3: Overdue */}
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 h-[80px] flex flex-col justify-between dark:border-[#1E435E] dark:bg-[#0B2538] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                {t("dashboard.overdue") || "Overdue"}
              </span>
              <AlertTriangle size={16} className={overdueTasks > 0 ? "text-[#DC2626]" : "text-slate-500"} />
            </div>
            <span
              className={`text-[20px] font-bold leading-none tabular-nums tracking-tight block ${
                overdueTasks > 0 ? "text-[#DC2626]" : "text-[#0F172A] dark:text-white"
              }`}
            >
              {overdueTasks}
            </span>
          </div>

          {/* Tile 4: On-time Rate */}
          <div className="rounded-lg border border-[#CBD5E1] bg-white p-3.5 h-[80px] flex flex-col justify-between dark:border-[#1E435E] dark:bg-[#0B2538] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                {t("dashboard.onTimeRate") || "On-time rate"}
              </span>
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
            </div>
            <span className="text-[20px] font-bold leading-none text-[#0F172A] dark:text-white tabular-nums tracking-tight block">
              {onTimeRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer link to Reports */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E435E] flex items-center justify-between">
        <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
          {language === "hi" ? "कार्यबल दक्षता विश्लेषण" : "Workforce efficiency overview"}
        </span>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] transition-colors"
        >
          <span>{language === "hi" ? "विस्तृत रिपोर्ट देखें" : "View full report"}</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
