"use client";

import {
  ArrowUpRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  Users,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { DashboardOverview, DashboardTrends, TrendItem } from "../types";

interface DashboardStatsProps {
  overview: DashboardOverview;
  trends?: DashboardTrends;
}

export interface KpiCardProps {
  icon?: React.ReactNode;
  title: string;
  value: number | string;
  subtitle: string;
  trend?: TrendItem;
  href?: string;
  ariaLabel?: string;
  sparklineColor: string;
  sparklineBars?: number[];
}

// Mini Bar Sparkline Chart
function StatMiniBarChart({
  color,
  bars = [35, 55, 40, 70, 60, 85, 100],
}: {
  color: string;
  bars?: number[];
}) {
  return (
    <div className="flex items-end gap-[3px] h-[28px] w-[42px] shrink-0" aria-hidden="true">
      {bars.map((heightPercent, idx) => (
        <span
          key={idx}
          className="w-[3px] rounded-full transition-all duration-300"
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

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  href,
  ariaLabel,
  sparklineColor,
  sparklineBars = [35, 55, 40, 70, 60, 85, 100],
}: KpiCardProps) {
  const router = useRouter();
  const hasTrend = Boolean(trend && trend.value && trend.value !== "—");
  const isDown = trend?.isDown ?? false;
  const isPositive = trend?.isPositive ?? true;

  const cardInner = (
    <div className="flex h-full flex-col justify-between select-none">
      {/* Top Row: Uppercase Label + Action Arrow */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1] truncate">
          {title}
        </span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#64748B] group-hover:text-[#1D4ED8] dark:text-slate-400 transition-colors">
          <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>

      {/* Middle Row: Large KPI Number */}
      <div className="my-auto py-0.5">
        <span className="text-[28px] font-bold tracking-[-0.02em] leading-[34px] text-[#0F172A] dark:text-white tabular-nums">
          {value}
        </span>
      </div>

      {/* Bottom Row: Supporting metric & trend + Mini Bar Sparkline */}
      <div className="flex items-end justify-between gap-2 pt-2 border-t border-[#CBD5E1]/60 dark:border-[#1E435E]/60">
        <div className="flex flex-col min-w-0 pr-1">
          {hasTrend && trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-semibold leading-[16px] tabular-nums shrink-0 ${
                isDown
                  ? "text-[#DC2626] dark:text-rose-400"
                  : isPositive
                  ? "text-[#16A34A] dark:text-emerald-400"
                  : "text-[#D97706] dark:text-amber-400"
              }`}
            >
              <span>{isDown ? "↓" : "↑"}</span>
              <span>{trend.value}</span>
            </span>
          )}
          <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8] truncate">
            {subtitle}
          </span>
        </div>
        <StatMiniBarChart color={sparklineColor} bars={sparklineBars} />
      </div>
    </div>
  );

  const cardClasses =
    "group relative block h-[142px] rounded-xl border border-[#CBD5E1] bg-white p-4 cursor-pointer transition-all duration-150 ease-out hover:border-[#1D4ED8]/60 hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] dark:border-[#1E435E] dark:bg-[#0B2538] dark:hover:border-[#38BDF8]/60 shadow-2xs";

  const label = ariaLabel || `View ${title.toLowerCase()}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (href && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      router.push(href);
    }
  };

  if (!href) {
    return <div className={cardClasses}>{cardInner}</div>;
  }

  return (
    <Link
      href={href}
      className={cardClasses}
      role="link"
      tabIndex={0}
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {cardInner}
    </Link>
  );
}

export default function DashboardStats({
  overview,
  trends,
}: DashboardStatsProps) {
  const { t } = useLanguage();
  const completedPercentage =
    overview.totalTasks > 0
      ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
      : 0;

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
      {/* 1. TOTAL EMPLOYEES */}
      <KpiCard
        title={t("dashboard.totalEmployees") || "Total Employees"}
        value={overview.totalEmployees}
        subtitle={t("dashboard.activeWorkforce") || "Active workforce"}
        trend={trends?.employees}
        href="/admin/employees"
        ariaLabel={t("dashboard.viewAllEmployees") || "View all employees"}
        sparklineColor="#00A6C7"
        sparklineBars={[32, 50, 42, 68, 55, 80, 100]}
      />

      {/* 2. ACTIVE EMPLOYEES */}
      <KpiCard
        title={t("dashboard.activeEmployees") || "Active Employees"}
        value={overview.activeEmployees}
        subtitle={t("dashboard.inactiveEmployees", { count: overview.inactiveEmployees }) || `${overview.inactiveEmployees} inactive`}
        href="/admin/employees?status=active"
        ariaLabel={t("dashboard.viewActiveEmployees") || "View active employees"}
        sparklineColor="#00A878"
        sparklineBars={[38, 58, 52, 75, 68, 92, 88]}
      />

      {/* 3. TOTAL TASKS */}
      <KpiCard
        title={t("dashboard.totalTasks") || "Total Tasks"}
        value={overview.totalTasks}
        subtitle={t("dashboard.pendingWork", { count: overview.pendingTasks }) || `${overview.pendingTasks} pending`}
        trend={trends?.tasks}
        href="/admin/tasks"
        ariaLabel={t("dashboard.viewAllTasks") || "View all tasks"}
        sparklineColor="#063B61"
        sparklineBars={[25, 42, 38, 70, 58, 85, 95]}
      />

      {/* 4. COMPLETED TASKS */}
      <KpiCard
        title={t("dashboard.completedTasks") || "Completed Tasks"}
        value={overview.completedTasks}
        subtitle={t("dashboard.completionPercentage", { percentage: completedPercentage }) || `${completedPercentage}% completion`}
        trend={trends?.completed}
        href="/admin/tasks?status=completed"
        ariaLabel={t("dashboard.viewCompletedTasks") || "View completed tasks"}
        sparklineColor="#00A878"
        sparklineBars={[38, 58, 52, 75, 68, 92, 88]}
      />

      {/* 5. OVERDUE TASKS */}
      <KpiCard
        title={t("dashboard.overdueTasks") || "Overdue Tasks"}
        value={overview.overdueTasks}
        subtitle={
          overview.overdueTasks > 0
            ? (t("dashboard.actionRequired") || "Action required")
            : (t("dashboard.allOnSchedule") || "All on schedule")
        }
        trend={trends?.overdue}
        href="/admin/tasks?status=overdue"
        ariaLabel={t("dashboard.viewOverdueTasks") || "View overdue tasks"}
        sparklineColor="#E5484D"
        sparklineBars={[20, 35, 18, 45, 25, 30, 42]}
      />
    </section>
  );
}
