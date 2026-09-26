"use client";

import { Building2, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { EmployeePerformanceItem, RecentTaskItem } from "../types";

interface DepartmentPerformanceProps {
  employees: EmployeePerformanceItem[];
  tasks: RecentTaskItem[];
}

interface DeptMetric {
  name: string;
  totalEmployees: number;
  assignedTasks: number;
  completedTasks: number;
  completionRate: number;
}

import { useDepartments } from "@/hooks/useDepartments";
import { useLanguage } from "@/context/LanguageContext";

export default function DepartmentPerformance({
  employees,
  tasks,
}: DepartmentPerformanceProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });

  // Aggregate department metrics from real dynamic data
  const deptMetrics: DeptMetric[] = useMemo(() => {
    // Collect all departments from master data + employees
    const deptSet = new Set<string>(masterDeptNames);
    employees.forEach((e) => {
      if (e.department && e.department.trim()) {
        deptSet.add(e.department.trim());
      }
    });

    const list: DeptMetric[] = [];

    deptSet.forEach((dept) => {
      const deptEmployees = employees.filter(
        (e) => (e.department || "").toLowerCase() === dept.toLowerCase()
      );
      const totalEmployees = deptEmployees.length;

      // Sum assigned & completed tasks from employee performance records
      let assignedTasks = 0;
      let completedTasks = 0;

      deptEmployees.forEach((e) => {
        assignedTasks += Number(e.totalTasks || 0);
        completedTasks += Number(e.completedTasks || 0);
      });

      // If no tasks assigned yet to employees, check tasks directly
      if (assignedTasks === 0 && tasks.length > 0) {
        tasks.forEach((t) => {
          const empId =
            typeof t.assignedTo === "object" && t.assignedTo !== null
              ? (t.assignedTo as any)._id || (t.assignedTo as any).id
              : t.assignedTo;
          const matchingEmp = deptEmployees.find(
            (e) => e.id === empId || e._id === empId
          );
          if (matchingEmp) {
            assignedTasks++;
            if (String(t.status || "").toUpperCase() === "COMPLETED") {
              completedTasks++;
            }
          }
        });
      }

      const completionRate =
        assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0;

      list.push({
        name: dept,
        totalEmployees,
        assignedTasks,
        completedTasks,
        completionRate,
      });
    });

    // Sort by assignedTasks or completion rate descending
    return list.sort((a, b) => b.assignedTasks - a.assignedTasks || b.totalEmployees - a.totalEmployees);
  }, [employees, tasks]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-none dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-6 xl:col-span-6 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#718E9A]">
              {t("departments.registryEyebrow") || "ORGANIZATION UNITS"}
            </p>
            <h3 className="mt-0.5 text-[18px] sm:text-[19px] font-semibold text-[#0F172A] dark:text-[#E5F1F5] tracking-tight">
              {t("dashboard.departmentPerformance") || "Department performance"}
            </h3>
            <p className="mt-0.5 text-[12.5px] font-normal text-[#64748B] dark:text-[#8CB0C7]">
              {t("departments.registrySubtitle") || "Completion velocity and resource allocation across organizational units."}
            </p>
          </div>
        </div>

        {/* Department List Rows */}
        <div className="mt-5 space-y-2.5">
          {deptMetrics.slice(0, 6).map((dept) => {
            // Color progress bar depending on completion rate
            const barColor =
              dept.completionRate >= 70
                ? "bg-[#16A34A]"
                : dept.completionRate >= 45
                ? "bg-[#2563EB]"
                : dept.completionRate > 0
                ? "bg-[#D97706]"
                : "bg-[#E2E8F0]";

            return (
              <div
                key={dept.name}
                onClick={() =>
                  router.push(`/admin/tasks?department=${encodeURIComponent(dept.name)}`)
                }
                className="group flex flex-col rounded-lg border border-[#E2E8F0] p-3 transition-colors hover:bg-[#F8FAFC] dark:border-[#1A3D54] dark:hover:bg-[#12364E] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Department Name & Employee Count */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] transition-transform group-hover:scale-105 dark:bg-[#163854] dark:text-[#38BDF8]">
                      <Building2 size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                        {dept.name}
                      </p>
                      <div className="flex items-center gap-2 text-[11.5px] text-[#64748B] dark:text-[#718E9A]">
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {dept.totalEmployees} {language === "hi" ? "सदस्य" : dept.totalEmployees === 1 ? "member" : "members"}
                        </span>
                        <span>•</span>
                        <span>{dept.assignedTasks} {language === "hi" ? "सौंपा गया" : "assigned"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Completion % & Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[13.5px] font-semibold text-[#0F172A] dark:text-white tabular-nums">
                        {dept.completionRate}%
                      </span>
                      <p className="text-[11px] text-[#64748B] dark:text-[#718E9A]">
                        {dept.completedTasks} {language === "hi" ? "पूर्ण" : "done"}
                      </p>
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-[#94A3B8] transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </div>

                {/* Horizontal Bar Chart for Completion Rate */}
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-[#163854]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.max(2, dept.completionRate)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-4 pt-3.5 border-t border-[#F1F5F9] dark:border-[#1E435E] flex items-center justify-between text-xs">
        <span className="text-[#64748B] dark:text-[#718E9A]">
          {language === "hi"
            ? `शीर्ष ${Math.min(6, deptMetrics.length)} विभाग दिखाए जा रहे हैं`
            : `Showing top ${Math.min(6, deptMetrics.length)} departments`}
        </span>
        <button
          type="button"
          onClick={() => router.push("/admin/departments")}
          className="font-medium text-[#2563EB] hover:underline dark:text-[#38BDF8] cursor-pointer"
        >
          {language === "hi" ? "सभी विभाग प्रबंधित करें →" : "Manage all departments →"}
        </button>
      </div>
    </div>
  );
}
