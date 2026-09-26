"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { EmployeePerformanceItem, PaginationData } from "../types";
import { GoToPage } from "@/components/ui/GoToPage";
import { useDepartments } from "@/hooks/useDepartments";
import { ROLES, getRoleLabel } from "@/constants/rbac";

export interface EmployeePerformanceFilters {
  department: string;
  role: string;
  dateRange: string;
}

interface EmployeePerformanceProps {
  employees: EmployeePerformanceItem[];
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  loading?: boolean;
  filters: EmployeePerformanceFilters;
  onFilterChange: (filters: EmployeePerformanceFilters) => void;
}

// Subtle pastel avatar palettes
const PASTEL_PALETTES = [
  { bg: "bg-slate-100", text: "text-slate-700" },
  { bg: "bg-blue-50", text: "text-blue-700" },
  { bg: "bg-emerald-50", text: "text-emerald-700" },
  { bg: "bg-amber-50", text: "text-amber-700" },
  { bg: "bg-purple-50", text: "text-purple-700" },
  { bg: "bg-indigo-50", text: "text-indigo-700" },
];

function getAvatarPalette(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_PALETTES[Math.abs(hash) % PASTEL_PALETTES.length];
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "EM"
  );
}

export default function EmployeePerformance({
  employees,
  pagination,
  onPageChange,
  loading = false,
  filters,
  onFilterChange,
}: EmployeePerformanceProps) {
  const { t, language } = useLanguage();
  const router = useRouter();

  // Authoritative departments list from master data
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });
  const departments = useMemo(() => {
    return Array.from(new Set(masterDeptNames.filter(Boolean)));
  }, [masterDeptNames]);

  // Authoritative Application Roles
  const roleOptions = useMemo(
    () => [
      { value: "ALL", label: t("common.allRoles") || "All Roles" },
      { value: ROLES.EMPLOYEE, label: getRoleLabel(ROLES.EMPLOYEE, t) },
      { value: ROLES.ADMINISTRATOR, label: getRoleLabel(ROLES.ADMINISTRATOR, t) },
      { value: ROLES.SUPER_ADMIN, label: getRoleLabel(ROLES.SUPER_ADMIN, t) },
    ],
    [t]
  );

  // Date Range Options (Default: All Time)
  const periodOptions = useMemo(
    () => [
      { value: "all-time", label: t("common.allTime") || "All Time" },
      { value: "this-month", label: t("common.thisMonth") || "This Month" },
      { value: "this-quarter", label: t("common.thisQuarter") || "This Quarter" },
      { value: "this-year", label: t("common.thisYear") || "This Year" },
    ],
    [t]
  );

  const total = pagination.total || employees.length || 0;
  const page = pagination.page || 1;
  const limit = pagination.limit || 6;
  const totalPages = pagination.totalPages || Math.ceil(total / limit) || 1;

  const startRecord = total > 0 ? (page - 1) * limit + 1 : 0;
  const endRecord = Math.min(page * limit, total);

  // Generate page numbers for pagination
  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const maxBtns = Math.min(4, totalPages);
    for (let i = 1; i <= maxBtns; i++) {
      nums.push(i);
    }
    return nums;
  }, [totalPages]);

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#334155] dark:text-[#94A3B8]">
              {t("dashboard.workforceLeaderboard") || "WORKFORCE LEADERBOARD"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.employeePerformance") || "Employee performance"}
            </h3>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {t("dashboard.rankedByEfficiency") || "Ranked by task execution and completion efficiency."}
            </p>
          </div>

          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] transition-colors"
          >
            {t("dashboard.viewAllEmployees") || "View all employees"} <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="relative">
            <select
              value={filters.department}
              onChange={(e) => onFilterChange({ ...filters, department: e.target.value })}
              className="h-9 appearance-none rounded-lg border border-[#CBD5E1] bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#0F172A] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:outline-none dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-white cursor-pointer shadow-2xs"
            >
              <option value="ALL">{t("common.allDepartments") || "All Departments"}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475569] dark:text-[#94A3B8]"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={filters.role}
              onChange={(e) => onFilterChange({ ...filters, role: e.target.value })}
              className="h-9 appearance-none rounded-lg border border-[#CBD5E1] bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#0F172A] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:outline-none dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-white cursor-pointer shadow-2xs"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475569] dark:text-[#94A3B8]"
            />
          </div>

          {/* Period Filter */}
          <div className="relative">
            <select
              value={filters.dateRange}
              onChange={(e) => onFilterChange({ ...filters, dateRange: e.target.value })}
              className="h-9 appearance-none rounded-lg border border-[#CBD5E1] bg-white py-1.5 pl-3 pr-8 text-[13px] font-medium text-[#0F172A] hover:border-[#2563EB]/60 focus:border-[#2563EB] focus:outline-none dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-white cursor-pointer shadow-2xs"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#475569] dark:text-[#94A3B8]"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="mt-4 overflow-x-auto min-h-[350px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-[52px] rounded-lg bg-[#F8FAFC] dark:bg-[#163854] animate-pulse"
                />
              ))}
            </div>
          ) : employees.length === 0 ? (
            <div className="my-16 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-[#063B61] dark:text-white">
                {t("dashboard.noEmployeesMatch") || "No employees match the selected criteria"}
              </p>
              <p className="text-xs text-[#64748B] dark:text-[#718E9A] mt-1">
                {t("dashboard.trySelectingOther") || "Try selecting “All Departments” or “All Roles”."}
              </p>
            </div>
          ) : (
            <table className="enterprise-table w-full text-left text-xs border-collapse border border-[#CBD5E1] dark:border-[#1E3A47]">
              <thead className="border-b border-[#CBD5E1] bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#102A36]">
                <tr className="h-[40px] border-b border-[#CBD5E1] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#CBD5E1]">
                  <th className="py-2.5 pl-3 pr-1 w-6 border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colRank") || "#"}</th>
                  <th className="py-2.5 px-2 border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colEmployee") || "EMPLOYEE"}</th>
                  <th className="py-2.5 px-2 border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colDepartment") || "DEPARTMENT"}</th>
                  <th className="py-2.5 px-1 text-center border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colAssigned") || "ASSIGNED"}</th>
                  <th className="py-2.5 px-1 text-center border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colDone") || "DONE"}</th>
                  <th className="py-2.5 px-1 text-center border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colInProgress") || "IN PROGRESS"}</th>
                  <th className="py-2.5 px-2 border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colCompletion") || "COMPLETION"}</th>
                  <th className="py-2.5 px-2 text-center border-b border-[#CBD5E1] dark:border-[#1E3A47]">{t("dashboard.colPerformance") || "PERFORMANCE"}</th>
                  <th className="py-2.5 pr-2 w-6 text-right border-b border-[#CBD5E1] dark:border-[#1E3A47]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
                {employees.map((employee, idx) => {
                  const empId = employee.id || employee._id || String(idx);
                  const rankNumber = (page - 1) * limit + idx + 1;
                  const empName =
                    employee.name ||
                    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                    "Employee";
                  const avatar = getAvatarPalette(empName);
                  const progress = Number(employee.completionRate || 0);
                  const totalTasks = Number(employee.totalTasks || 0);
                  const completed = Number(employee.completedTasks || 0);
                  const inProgress = Number(employee.inProgressTasks || 0);

                  // Performance badges using exact status system colors:
                  let perfBadge = {
                    label: t("dashboard.perfAverage") || "Average",
                    isUp: true,
                    cls: "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] dark:bg-[#451A03]/50 dark:text-[#FBBF24]",
                  };

                  if (progress >= 75) {
                    perfBadge = {
                      label: t("dashboard.perfExcellent") || "Excellent",
                      isUp: true,
                      cls: "bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] dark:bg-[#064E3B]/50 dark:text-[#34D399]",
                    };
                  } else if (progress >= 55) {
                    perfBadge = {
                      label: t("dashboard.perfGood") || "Good",
                      isUp: true,
                      cls: "bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] dark:bg-[#064E3B]/50 dark:text-[#34D399]",
                    };
                  } else if (progress < 35) {
                    perfBadge = {
                      label: t("dashboard.perfNeedsFocus") || "Needs Focus",
                      isUp: false,
                      cls: "bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2] dark:bg-[#7F1D1D]/50 dark:text-[#F87171]",
                    };
                  }

                  const barColor = progress >= 75 ? "bg-[#16A34A]" : "bg-[#2563EB]";

                  return (
                    <tr
                      key={empId}
                      onClick={() => router.push(`/admin/employees/${empId}`)}
                      className="h-[52px] cursor-pointer bg-white border-b border-[#E5E7EB] transition-colors hover:bg-[#F8FAFC] dark:bg-[#0B202B] dark:border-[#18333F] dark:hover:bg-[#102A36]"
                    >
                      {/* # Rank Number */}
                      <td className="py-2.5 pl-3 pr-1">
                        <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white tabular-nums">
                          {rankNumber}
                        </span>
                      </td>

                      {/* Employee Avatar + Name + Subtitle */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          {employee.profilePhoto ? (
                            <img
                              src={employee.profilePhoto}
                              alt={empName}
                              className="h-8 w-8 rounded-full object-cover shrink-0 border border-[#CBD5E1]"
                            />
                          ) : (
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-[11px] ${avatar.bg} ${avatar.text}`}
                            >
                              {getInitials(empName)}
                            </div>
                          )}

                          <div className="min-w-0 max-w-[130px] sm:max-w-[170px]">
                            <p className="truncate text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                              {empName}
                            </p>
                            <p className="truncate text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                              {employee.designation || employee.role || "Employee"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-2">
                        <span className="text-[13px] font-medium leading-[18px] text-[#334155] dark:text-[#CBD5E1] truncate block max-w-[100px]">
                          {employee.department || "General"}
                        </span>
                      </td>

                      {/* Assigned Tasks */}
                      <td className="py-2.5 px-1 text-center">
                        <span className="text-[13px] font-semibold text-[#0F172A] dark:text-white tabular-nums">
                          {totalTasks}
                        </span>
                      </td>

                      {/* Done */}
                      <td className="py-2.5 px-1 text-center">
                        <span className="text-[13px] font-semibold text-[#16A34A] dark:text-[#34D399] tabular-nums">
                          {completed}
                        </span>
                      </td>

                      {/* In Progress */}
                      <td className="py-2.5 px-1 text-center">
                        <span className="text-[13px] font-semibold text-[#2563EB] dark:text-[#38BDF8] tabular-nums">
                          {inProgress}
                        </span>
                      </td>

                      {/* Completion Progress Bar + % */}
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 min-w-[70px] max-w-[100px]">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#163854]">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                            />
                          </div>
                          <span className="text-[12px] font-semibold text-[#0F172A] dark:text-white tabular-nums shrink-0">
                            {progress}%
                          </span>
                        </div>
                      </td>

                      {/* Performance Badge */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] sm:text-[12px] font-semibold leading-[16px] ${perfBadge.cls} whitespace-nowrap`}
                        >
                          {perfBadge.isUp ? (
                            <ArrowUp size={11} strokeWidth={2.5} />
                          ) : (
                            <ArrowDown size={11} strokeWidth={2.5} />
                          )}
                          <span>{perfBadge.label}</span>
                        </span>
                      </td>

                      {/* Three Dots Menu Button */}
                      <td className="py-2.5 pr-2 text-right">
                        <button
                          type="button"
                          aria-label={`Options for ${empName}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/employees/${empId}`);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#163854] dark:hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#CBD5E1] pt-3.5 mt-2 dark:border-[#1E435E] text-xs flex-wrap">
        <span className="text-[13px] font-normal text-[#64748B] dark:text-[#94A3B8]">
          {language === "hi" ? (
            <>
              <strong className="font-semibold text-[#0F172A] dark:text-white">{total}</strong> कर्मचारियों में से{" "}
              <strong className="font-semibold text-[#0F172A] dark:text-white">{startRecord}</strong> से{" "}
              <strong className="font-semibold text-[#0F172A] dark:text-white">{endRecord}</strong> दिखाए जा रहे हैं
            </>
          ) : (
            <>
              Showing{" "}
              <strong className="font-semibold text-[#0F172A] dark:text-white">{startRecord}</strong> to{" "}
              <strong className="font-semibold text-[#0F172A] dark:text-white">{endRecord}</strong> of{" "}
              <strong className="font-semibold text-[#0F172A] dark:text-white">{total}</strong> employees
            </>
          )}
        </span>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
              aria-label={t("common.previous") || "Previous Page"}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#8CB0C7] transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num)}
                disabled={loading}
                className={`flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-[12px] font-semibold transition cursor-pointer ${
                  page === num
                    ? "bg-[#1D4ED8] text-white shadow-xs dark:bg-[#00A6C7]"
                    : "border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#8CB0C7]"
                }`}
              >
                {num}
              </button>
            ))}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
              aria-label={t("common.next") || "Next Page"}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-[#8CB0C7] transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <GoToPage
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            disabled={loading}
          />
        </div>
      </div>
    </div>
  );
}
