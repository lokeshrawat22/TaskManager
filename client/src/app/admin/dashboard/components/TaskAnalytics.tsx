"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { TaskDistribution } from "../types";

interface TaskAnalyticsProps {
  taskDistribution: TaskDistribution;
  totalTasks: number;
  overdueTasks?: number;
  period: string;
  onPeriodChange: (period: string) => void;
}

export default function TaskAnalytics({
  taskDistribution,
  totalTasks,
  overdueTasks = 0,
  period,
  onPeriodChange,
}: TaskAnalyticsProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const PERIOD_LABELS: Record<string, string> = useMemo(() => ({
    all_time: t("common.allTime") || "All Time",
    this_month: t("common.thisMonth") || "This Month",
    last_month: t("common.lastMonth") || "Last Month",
    this_quarter: t("common.thisQuarter") || "This Quarter",
    this_year: t("common.thisYear") || "This Year",
  }), [t]);

  const completed = Number(taskDistribution.COMPLETED || 0);
  const inProgress = Number(taskDistribution.IN_PROGRESS || 0);
  const pending = Number(taskDistribution.PENDING || 0);
  const activePipeline = inProgress + pending;

  const completedPct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;
  const inProgressPct = totalTasks > 0 ? Math.round((inProgress / totalTasks) * 100) : 0;
  const pendingPct = totalTasks > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 0;
  const overduePct = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;
  const activePct = totalTasks > 0 ? Math.round((activePipeline / totalTasks) * 100) : 0;

  // Circumference of r=68 is ~427.26
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.26
  const completedDash = (completedPct / 100) * circumference;
  const inProgressDash = (inProgressPct / 100) * circumference;
  const pendingDash = (pendingPct / 100) * circumference;

  const segments = useMemo(
    () => [
      {
        id: "COMPLETED",
        label: t("status.COMPLETED") || "Completed",
        subLabel: language === "hi" ? "वितरित और सत्यापित कार्य" : "Delivered & verified",
        count: completed,
        pct: completedPct,
        color: "#00A878",
        bgLight: "bg-[#ECFDF5]",
        borderLight: "border-[#A7F3D0]",
        textClass: "text-[#00A878]",
        icon: CheckCircle2,
        route: "/admin/tasks?status=COMPLETED",
      },
      {
        id: "IN_PROGRESS",
        label: t("status.IN_PROGRESS") || "In Progress",
        subLabel: language === "hi" ? "सक्रिय निष्पादन चरण" : "Active execution",
        count: inProgress,
        pct: inProgressPct,
        color: "#00A6C7",
        bgLight: "bg-[#EFF8FB]",
        borderLight: "border-[#BAE6FD]",
        textClass: "text-[#00A6C7]",
        icon: Clock,
        route: "/admin/tasks?status=IN_PROGRESS",
      },
      {
        id: "PENDING",
        label: t("status.PENDING") || "Pending",
        subLabel: language === "hi" ? "कतारबद्ध बैकलॉग कार्य" : "Queued in backlog",
        count: pending,
        pct: pendingPct,
        color: "#F2A51A",
        bgLight: "bg-[#FFFBEB]",
        borderLight: "border-[#FDE68A]",
        textClass: "text-[#D97706]",
        icon: Layers,
        route: "/admin/tasks?status=PENDING",
      },
      {
        id: "OVERDUE",
        label: t("status.OVERDUE") || "Overdue",
        subLabel: language === "hi" ? "समय सीमा समाप्त (कार्रवाई आवश्यक)" : "Past scheduled deadline",
        count: overdueTasks,
        pct: overduePct,
        color: "#E5484D",
        bgLight: "bg-[#FEF2F2]",
        borderLight: "border-[#FECACA]",
        textClass: "text-[#E5484D]",
        icon: AlertTriangle,
        route: "/admin/tasks?status=OVERDUE",
      },
    ],
    [t, language, completed, inProgress, pending, overdueTasks, completedPct, inProgressPct, pendingPct, overduePct]
  );

  const activeHovered = useMemo(() => {
    if (!hoveredSegment) return null;
    return segments.find((s) => s.id === hoveredSegment);
  }, [hoveredSegment, segments]);

  return (
    <div className="rounded-xl border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-7 flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#334155] dark:text-[#94A3B8]">
              {t("dashboard.taskAnalytics") || "TASK ANALYTICS"}
            </p>
            <h2 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.taskWorkloadDistribution") || "Task workload distribution"}
            </h2>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {t("dashboard.taskBreakdownSubtitle") || "Real-time task breakdown by operational state."}
            </p>
          </div>

          {/* Clean White Period Filter Dropdown */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-[13px] font-medium text-[#0F172A] hover:border-[#2563EB] focus:border-[#2563EB] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#CBD5E1] transition-colors cursor-pointer shadow-2xs"
            >
              <span>{PERIOD_LABELS[period] || period}</span>
              <ChevronDown size={14} className="text-[#475569] dark:text-[#94A3B8]" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-20 min-w-[150px] rounded-lg border border-[#CBD5E1] bg-white py-1 shadow-md dark:border-[#1E435E] dark:bg-[#0B2538]">
                  {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onPeriodChange(key);
                        setDropdownOpen(false);
                      }}
                      className={`block w-full px-3.5 py-1.5 text-left text-[13px] font-medium transition-colors cursor-pointer ${
                        period === key
                          ? "bg-[#EFF6FF] text-[#1D4ED8] font-semibold dark:bg-[#123C46]/50 dark:text-[#4CD2DA]"
                          : "text-[#334155] hover:bg-[#F8FAFC] dark:text-[#CBD5E1] dark:hover:bg-[#12364E]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Donut Chart and Interactive Metric Rows */}
        {totalTasks === 0 ? (
          <div className="my-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-[#475569] dark:text-[#94A3B8]">
              {t("common.noData") || "No tasks available for this period."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            {/* Left: SVG Donut Visualizer with Center Badge (5 cols on desktop) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative flex items-center justify-center">
                <svg className="w-[184px] h-[184px] transform -rotate-90">
                  {/* Background track circle */}
                  <circle
                    cx="92"
                    cy="92"
                    r={radius}
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="18"
                    className="dark:stroke-slate-800"
                  />

                  {/* Completed Segment (Emerald #00A878) */}
                  {completedPct > 0 && (
                    <circle
                      cx="92"
                      cy="92"
                      r={radius}
                      fill="none"
                      stroke="#00A878"
                      strokeWidth={hoveredSegment === "COMPLETED" ? 22 : 18}
                      strokeDasharray={`${completedDash} ${circumference}`}
                      strokeDashoffset="0"
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredSegment("COMPLETED")}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => router.push("/admin/tasks?status=COMPLETED")}
                    />
                  )}

                  {/* In Progress Segment (Brand Cyan/Teal #00A6C7) */}
                  {inProgressPct > 0 && (
                    <circle
                      cx="92"
                      cy="92"
                      r={radius}
                      fill="none"
                      stroke="#00A6C7"
                      strokeWidth={hoveredSegment === "IN_PROGRESS" ? 22 : 18}
                      strokeDasharray={`${inProgressDash} ${circumference}`}
                      strokeDashoffset={`-${completedDash}`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredSegment("IN_PROGRESS")}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => router.push("/admin/tasks?status=IN_PROGRESS")}
                    />
                  )}

                  {/* Pending Segment (Amber #F2A51A) */}
                  {pendingPct > 0 && (
                    <circle
                      cx="92"
                      cy="92"
                      r={radius}
                      fill="none"
                      stroke="#F2A51A"
                      strokeWidth={hoveredSegment === "PENDING" ? 22 : 18}
                      strokeDasharray={`${pendingDash} ${circumference}`}
                      strokeDashoffset={`-${completedDash + inProgressDash}`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredSegment("PENDING")}
                      onMouseLeave={() => setHoveredSegment(null)}
                      onClick={() => router.push("/admin/tasks?status=PENDING")}
                    />
                  )}
                </svg>

                {/* Donut Center Display */}
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-2">
                  <span className="text-[28px] font-bold text-[#0F172A] dark:text-white tabular-nums leading-none tracking-[-0.02em]">
                    {activeHovered ? activeHovered.count : totalTasks}
                  </span>
                  <span className="mt-1 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-[0.04em] leading-tight">
                    {activeHovered ? activeHovered.label : (t("dashboard.totalTasks") || "TOTAL TASKS")}
                  </span>
                  <span
                    className={`mt-1.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-[16px] ${
                      activeHovered
                        ? `${activeHovered.bgLight} ${activeHovered.textClass}`
                        : "bg-[#ECFDF5] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400"
                    }`}
                  >
                    {activeHovered ? `${activeHovered.pct}% of total` : `${completedPct}% delivered`}
                  </span>
                </div>
              </div>

              {/* Subtitle Under Donut */}
              <div className="mt-2.5 text-center">
                <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#CBD5E1]">
                  {language === "hi"
                    ? `${totalTasks} संगठनात्मक कार्य रिकॉर्ड किए गए`
                    : `${totalTasks} total organizational tasks`}
                </p>
              </div>
            </div>

            {/* Right: 4 Rich Interactive Metric Micro-Cards (7 cols on desktop) */}
            <div className="md:col-span-7 space-y-2">
              {segments.map((seg) => {
                const IconComponent = seg.icon;
                const isHovered = hoveredSegment === seg.id;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => router.push(seg.route)}
                    onMouseEnter={() => setHoveredSegment(seg.id)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    className={`w-full text-left rounded-lg border p-2.5 transition-all cursor-pointer ${
                      isHovered
                        ? "border-[#2563EB] bg-[#F8FAFC] shadow-2xs dark:border-[#2563EB] dark:bg-[#12364E]"
                        : "border-[#CBD5E1] bg-white hover:border-[#2563EB]/60 hover:bg-[#F8FAFC] dark:border-[#1E435E] dark:bg-[#071F2C] dark:hover:bg-[#0D2430]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left: Icon + Title + Subtitle */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${seg.bgLight} ${seg.borderLight} ${seg.textClass} dark:bg-slate-800`}
                        >
                          <IconComponent size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#0F172A] dark:text-white leading-[18px] truncate">
                            {seg.label}
                          </p>
                          <p className="text-[12px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-[17px] truncate">
                            {seg.subLabel}
                          </p>
                        </div>
                      </div>

                      {/* Right: Count + Percentage Pill */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white tabular-nums">
                          {seg.count}
                        </span>
                        <span
                          className={`inline-flex min-w-[42px] justify-center items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-[16px] tabular-nums ${seg.bgLight} ${seg.textClass} border ${seg.borderLight}`}
                        >
                          {seg.pct}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#163854]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, seg.pct))}%`,
                          backgroundColor: seg.color,
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom 3-Metric Summary Strip (Matching OrganizationPerformance 2x2 Grid) */}
        {totalTasks > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Tile 1: Active Workload Pipeline */}
            <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 dark:border-[#1E435E] dark:bg-[#071F2C] shadow-2xs flex flex-col justify-between h-[76px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                  {language === "hi" ? "सक्रिय पाइपलाइन" : "Active Pipeline"}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold leading-none text-[#0F172A] dark:text-white tabular-nums tracking-tight">
                  {activePipeline}
                </span>
                <span className="text-[12px] font-normal leading-[1.4] text-[#64748B] dark:text-[#94A3B8]">
                  {language === "hi" ? `कार्य (${activePct}%)` : `tasks (${activePct}%)`}
                </span>
              </div>
            </div>

            {/* Tile 2: Delivery Completion Rate */}
            <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 dark:border-[#1E435E] dark:bg-[#071F2C] shadow-2xs flex flex-col justify-between h-[76px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                  {language === "hi" ? "पूर्णता अनुपात" : "Delivery Rate"}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold leading-none text-[#16A34A] dark:text-[#34D399] tabular-nums tracking-tight">
                  {completedPct}%
                </span>
                <span className="text-[12px] font-normal leading-[1.4] text-[#64748B] dark:text-[#94A3B8]">
                  {language === "hi" ? `वितरित (${completed})` : `delivered (${completed})`}
                </span>
              </div>
            </div>

            {/* Tile 3: Needs Attention */}
            <div className="rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-3 dark:border-[#1E435E] dark:bg-[#071F2C] shadow-2xs flex flex-col justify-between h-[76px]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold leading-[1.4] text-[#334155] dark:text-[#CBD5E1]">
                  {language === "hi" ? "अतिदेय कार्य" : "Needs Attention"}
                </span>
                <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold leading-none text-[#DC2626] tabular-nums tracking-tight">
                  {overdueTasks}
                </span>
                <span className="text-[12px] font-normal leading-[1.4] text-[#64748B] dark:text-[#94A3B8]">
                  {language === "hi" ? "समय सीमा समाप्त" : "overdue tasks"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-[#1E435E] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
          <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
            {language === "hi" ? "वास्तविक समय कार्यबल वितरण" : "Live workspace task distribution"}
          </span>
        </div>
        <Link
          href="/admin/tasks"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] transition-colors"
        >
          <span>{language === "hi" ? "कार्य बैकलॉग देखें" : "View task backlog"}</span>
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
