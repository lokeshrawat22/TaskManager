"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { DashboardOverview, EmployeePerformanceItem } from "../types";

interface TeamPerformanceProps {
  overview: DashboardOverview;
  employees?: EmployeePerformanceItem[];
}

export default function TeamPerformance({
  overview,
  employees = [],
}: TeamPerformanceProps) {
  const { t, language } = useLanguage();
  const totalEmployees = Number(overview.totalEmployees ?? 0);
  const activeEmployees = Number(overview.activeEmployees ?? 0);
  const inProgressTasks = Number(overview.inProgressTasks ?? 0);
  const completedTasks = Number(overview.completedTasks ?? 0);
  const totalTasks = Number(overview.totalTasks ?? 0);

  // Compute real completion rate safely
  const completionRate =
    typeof overview.completionRate === "number" && !isNaN(overview.completionRate)
      ? Math.min(Math.max(Math.round(overview.completionRate), 0), 100)
      : totalTasks > 0
      ? Math.min(Math.max(Math.round((completedTasks / totalTasks) * 100), 0), 100)
      : 0;

  // Active workforce percentage
  const activeRatio =
    totalEmployees > 0
      ? Math.min(Math.round((activeEmployees / totalEmployees) * 100), 100)
      : 0;

  const metrics = [
    {
      label: t("dashboard.totalEmployees") || "Team Members",
      value: totalEmployees,
      subtext: language === "hi" ? `${overview.totalDepartments ?? 7} सक्रिय विभाग` : `${overview.totalDepartments ?? 7} active departments`,
      icon: Users,
      iconBg: "bg-[#EFF8FB] text-[#007F9E] dark:bg-[#123C46]/50 dark:text-[#38BDF8]",
      borderHover: "hover:border-[#007F9E]/30",
    },
    {
      label: t("dashboard.activeEmployees") || "Active Today",
      value: activeEmployees,
      subtext: language === "hi" ? `${activeRatio}% परिचालन उपस्थिति` : `${activeRatio}% operational attendance`,
      icon: UserCheck,
      iconBg: "bg-[#ECFDF5] text-[#10B981] dark:bg-[#064E3B]/40 dark:text-[#34D399]",
      borderHover: "hover:border-[#10B981]/30",
      indicator: true,
    },
    {
      label: t("dashboard.inProgressTasks") || "Tasks In Progress",
      value: inProgressTasks,
      subtext: language === "hi" ? "सक्रिय निष्पादन चरण" : "Active execution phase",
      icon: Clock,
      iconBg: "bg-[#EFF7FB] text-[#0879D9] dark:bg-[#163854] dark:text-[#60A5FA]",
      borderHover: "hover:border-[#0879D9]/30",
    },
    {
      label: t("dashboard.completedTasks") || "Completed",
      value: completedTasks,
      subtext: language === "hi" ? `${completedTasks} वितरित` : `${completedTasks} delivered`,
      icon: CheckCircle2,
      iconBg: "bg-[#ECFDF5] text-[#00A878] dark:bg-[#064E3B]/40 dark:text-[#34D399]",
      borderHover: "hover:border-[#00A878]/30",
    },
  ];

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
              {language === "hi" ? "कार्यबल मेट्रिक्स" : "WORKFORCE METRICS"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.teamPerformance") || "Team Performance"}
            </h3>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi"
                ? "वास्तविक समय के प्रशासनिक कार्यबल परिणाम और निष्पादन।"
                : "Real-time administrative workforce output and deliverable execution."}
            </p>
          </div>

          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1 text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] shrink-0"
          >
            {language === "hi" ? "टीम देखें" : "View team"} <ArrowUpRight size={13} />
          </Link>
        </div>

        {/* Compact KPI Rows */}
        <div className="mt-4 space-y-2">
          {metrics.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="group flex h-[48px] w-full items-center justify-between rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 transition-all hover:border-[#00A6C7]/40 hover:bg-[#F8FAFC] dark:border-[#1A3D54] dark:hover:bg-[#12364E]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white leading-[18px]">
                      {item.label}
                    </p>
                    <p className="truncate text-[12px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-[17px]">
                      {item.subtext}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.indicator && (
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A878]" />
                    </span>
                  )}
                  <span className="text-[16px] font-semibold text-[#0F172A] dark:text-white tabular-nums">
                    {item.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Completion Rate Bar Visualization */}
        <div className="mt-4 rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 dark:border-[#1E435E] dark:bg-[#071926]/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-white border border-[#E2E8F0] text-[#0F172A] dark:bg-[#123C46] dark:text-[#38BDF8]">
                <TrendingUp size={13} />
              </div>
              <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white">
                {t("dashboard.completionRate") || "Completion Rate"}
              </span>
            </div>
            <span className="text-[14px] font-semibold text-[#00A878] dark:text-[#34D399] tabular-nums">
              {completionRate}%
            </span>
          </div>

          {/* Sleek Progress Track */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#163854]">
            <div
              className="h-full rounded-full bg-[#00A878] transition-all duration-500 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
            <span>{completedTasks} {language === "hi" ? "पूर्ण" : "completed"}</span>
            <span>{totalTasks - completedTasks} {t("dashboard.remaining") || "remaining"}</span>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] dark:border-[#1E435E] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00A878]" />
          <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
            {language === "hi" ? "कार्यबल संचालन सक्रिय" : "Workforce operations active"}
          </span>
        </div>
        <Link
          href="/admin/employees"
          className="text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8]"
        >
          {language === "hi" ? "निर्देशिका प्रबंधित करें →" : "Manage directory →"}
        </Link>
      </div>
    </div>
  );
}
