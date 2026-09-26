"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Users,
  ClipboardCheck,
  Layers,
  FileSpreadsheet,
  FileText,
  Code2,
  FileDown,
  ShieldCheck,
  Database,
  Lock,
  FileCheck,
  Loader2,
  BarChart3,
} from "lucide-react";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { downloadExportFile } from "@/service/export.service";

// =====================================================
// TYPES
// =====================================================

type ExportScope = "employees" | "tasks" | "reports" | "all";
type ExportFormat = "csv" | "xlsx" | "json" | "pdf";

interface StatsData {
  totalEmployees: number;
  activeEmployees: number;
  totalTasks: number;
  completedTasks: number;
}

// =====================================================
// COMPONENT
// =====================================================

export default function AdminExportsPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [selectedScope, setSelectedScope] = useState<ExportScope>("employees");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
  });

  // ===================================================
  // FETCH STATS (REAL DATABASE COUNTS)
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const [empRes, taskRes] = await Promise.all([
          apiRequest<any>("/api/users/employees", { method: "GET" }).catch(() => null),
          apiRequest<any>("/api/tasks?limit=1000", { method: "GET" }).catch(() => null),
        ]);

        if (!mounted) return;

        const employeeData = empRes?.data;
        const employeesList: any[] = Array.isArray(employeeData)
          ? employeeData
          : employeeData?.employees ?? [];

        const taskData = taskRes?.data;
        const tasksList: any[] = Array.isArray(taskData)
          ? taskData
          : taskData?.tasks ?? [];

        const activeCount = employeesList.filter((e) => !e.isBlocked).length;
        const completedCount = tasksList.filter(
          (t) => String(t.status || "").toUpperCase() === "COMPLETED"
        ).length;

        setStats({
          totalEmployees: employeesList.length,
          activeEmployees: activeCount,
          totalTasks: tasksList.length,
          completedTasks: completedCount,
        });
      } catch (err) {
        console.error("Failed to load export metrics:", err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, []);

  // ===================================================
  // HANDLE EXPORT
  // ===================================================

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Special case: scope === "all" and format === "csv" downloads both CSVs sequentially
      if (selectedScope === "all" && selectedFormat === "csv") {
        await downloadExportFile("employees", "csv");
        await new Promise((resolve) => setTimeout(resolve, 300));
        await downloadExportFile("tasks", "csv");
      } else {
        await downloadExportFile(selectedScope, selectedFormat);
      }

      showToast.success(t("exports.exportSuccess") || "Export completed successfully.");
    } catch (error: any) {
      console.error("Export error:", error);
      const msg = error?.message || "Unable to export data. Please try again.";
      showToast.error(msg);
    } finally {
      setIsExporting(false);
    }
  };

  // Human-readable labels
  const scopeNames: Record<ExportScope, string> = {
    employees: t("exports.employees") || "Employees",
    tasks: t("exports.tasks") || "Tasks",
    reports: t("exports.reports") || "Executive Reports",
    all: t("exports.allData") || "All Data",
  };

  const formatNames: Record<ExportFormat, { label: string; ext: string }> = {
    csv: { label: "CSV", ext: ".csv" },
    xlsx: { label: "Excel", ext: ".xlsx" },
    json: { label: "JSON", ext: ".json" },
    pdf: { label: "PDF", ext: ".pdf" },
  };

  const currentRecordCount =
    selectedScope === "employees"
      ? stats.totalEmployees
      : selectedScope === "tasks" || selectedScope === "reports"
      ? stats.totalTasks
      : stats.totalEmployees + stats.totalTasks;

  return (
    <div className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] px-4 py-6 sm:px-8 sm:py-8 lg:px-9 dark:bg-[#071F2C]">
      <div className="mx-auto max-w-[1260px]">
        {/* =================================================
            PAGE TITLE SECTION + SUBTLE DECORATIVE VISUAL
        ================================================= */}
        <section className="relative flex flex-col justify-between gap-4 md:flex-row md:items-end">
          {/* Left Title & Description */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#0879D9]/30 bg-[#EAF5FC] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0879D9] dark:border-[#00C2E8]/35 dark:bg-[#0B2E42] dark:text-[#00C2E8]">
              <Download size={12} strokeWidth={2.4} />
              <span>{t("exports.workspaceExports") || "WORKSPACE EXPORTS"}</span>
            </div>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#07365A] dark:text-white sm:text-[34px]">
              {t("exports.exportsTitle") || "Data Exports"}
            </h1>

            <p className="mt-1 text-[13.5px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
              {t("exports.exportsSubtitle") || "Download verified organization data for workforce personnel, task tracking, and audit reporting."}
            </p>
          </div>

          {/* Right Decorative Export Visual + Live Database Source */}
          <div className="flex flex-col items-start md:items-end shrink-0">
            {/* Visual Cluster: Layered Document Sheets + Navy Download Box + Motivation Text */}
            <div className="relative hidden sm:flex items-center gap-3">
              {/* Layered Document Background Vector */}
              <div className="relative h-14 w-28 select-none pointer-events-none">
                {/* Document 1 (Back, slightly tilted) */}
                <div className="absolute left-1 top-1 h-12 w-16 -rotate-6 rounded-lg border border-[#D0DFEB] bg-white/80 p-1.5 shadow-2xs backdrop-blur-xs dark:border-[#1E435E] dark:bg-[#0B2538]/70">
                  <div className="h-1.5 w-6 rounded-full bg-[#CBDCE8] dark:bg-[#1E4868]" />
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1 w-10 rounded-full bg-[#E2ECF2] dark:bg-[#1A3C56]" />
                    <div className="h-1 w-8 rounded-full bg-[#E2ECF2] dark:bg-[#1A3C56]" />
                    <div className="h-1 w-11 rounded-full bg-[#E2ECF2] dark:bg-[#1A3C56]" />
                  </div>
                </div>

                {/* Document 2 (Front, upright) */}
                <div className="absolute left-7 top-0 h-13 w-16 rotate-3 rounded-lg border border-[#BCD4E6] bg-white p-1.5 shadow-xs dark:border-[#235070] dark:bg-[#0D2D44]">
                  <div className="h-1.5 w-8 rounded-full bg-[#0879D9]/40 dark:bg-[#00C2E8]/40" />
                  <div className="mt-1.5 space-y-1">
                    <div className="h-1 w-11 rounded-full bg-[#D5E4EF] dark:bg-[#1E4868]" />
                    <div className="h-1 w-9 rounded-full bg-[#D5E4EF] dark:bg-[#1E4868]" />
                    <div className="h-1 w-10 rounded-full bg-[#D5E4EF] dark:bg-[#1E4868]" />
                    <div className="h-1 w-7 rounded-full bg-[#D5E4EF] dark:bg-[#1E4868]" />
                  </div>
                </div>
              </div>

              {/* Navy Download Icon Box */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#063B61] text-white shadow-md">
                <Download size={20} strokeWidth={2.4} />
              </div>

              {/* Catchy Subtitle */}
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-[#07365A] dark:text-white">
                  {t("exports.exportAnalyze") || "Export. Analyze."}
                </p>
                <p className="text-[12px] font-medium text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.makeBetterDecisions") || "Make better decisions."}
                </p>
              </div>
            </div>

            {/* Live Database Source Pill */}
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-[#D6E2EB] bg-white px-3 py-1 text-xs font-bold text-[#07365A] shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#D7E7EC]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00A878] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00A878]" />
              </span>
              <span>{t("exports.liveDatabaseSource") || "Live Database Source"}</span>
            </div>
          </div>
        </section>

        {/* =================================================
            STATISTICS STRIP (SINGLE HORIZONTAL CARD)
        ================================================= */}
        <div className="mt-5 rounded-2xl border border-[#D6E2EB] bg-white shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="grid grid-cols-2 divide-y divide-[#E2ECF2] dark:divide-[#1A415C] lg:grid-cols-4 lg:divide-y-0 lg:divide-x">
            {/* 1. TOTAL EMPLOYEES */}
            <div className="flex items-center gap-3.5 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#0F354D] dark:text-[#00C2E8]">
                <Users size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.totalEmployees") || "TOTAL EMPLOYEES"}
                </p>
                <p className="text-[22px] font-bold leading-tight text-[#07365A] dark:text-white">
                  {loadingStats ? "—" : stats.totalEmployees}
                </p>
                <p className="text-[11.5px] font-medium text-[#66829A] dark:text-[#8CB0C7] truncate">
                  {t("exports.activeInOrganization") || "Active in organization"}
                </p>
              </div>
            </div>

            {/* 2. TOTAL TASKS */}
            <div className="flex items-center gap-3.5 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]">
                <ClipboardCheck size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.totalTasks") || "TOTAL TASKS"}
                </p>
                <p className="text-[22px] font-bold leading-tight text-[#07365A] dark:text-white">
                  {loadingStats ? "—" : stats.totalTasks}
                </p>
                <p className="text-[11.5px] font-medium text-[#66829A] dark:text-[#8CB0C7] truncate">
                  {t("exports.acrossAllDepartments") || "Across all departments"}
                </p>
              </div>
            </div>

            {/* 3. EXPORT FORMATS */}
            <div className="flex items-center gap-3.5 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F8F5] text-[#00A878] dark:bg-[#0D3631] dark:text-[#38DFBE]">
                <Layers size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.exportFormats") || "EXPORT FORMATS"}
                </p>
                <p className="text-[22px] font-bold leading-tight text-[#07365A] dark:text-white">
                  4
                </p>
                <p className="text-[11.5px] font-medium text-[#66829A] dark:text-[#8CB0C7] truncate">
                  {t("exports.availableFormats") || "Available formats"}
                </p>
              </div>
            </div>

            {/* 4. DATA SECURITY */}
            <div className="flex items-center gap-3.5 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF7EB] text-[#F5A623] dark:bg-[#3D2C17] dark:text-[#F8BA56]">
                <ShieldCheck size={20} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.dataSecurity") || "DATA SECURITY"}
                </p>
                <p className="text-[15px] sm:text-[16px] font-bold leading-tight text-[#07365A] dark:text-white truncate">
                  {t("exports.sanitizedAndEncrypted") || "Sanitized & Encrypted"}
                </p>
                <p className="text-[11.5px] font-medium text-[#66829A] dark:text-[#8CB0C7] truncate">
                  {t("exports.secureAndCompliant") || "Secure and compliant"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================
            MAIN EXPORT CONTAINER (DATASET -> FORMAT -> CTA)
        ================================================= */}
        <div className="mt-5 rounded-2xl border border-[#D6E2EB] bg-white p-5 sm:p-7 shadow-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
          {/* -----------------------------------------------
              SECTION 1: SELECT DATA TO EXPORT
          ----------------------------------------------- */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#063B61] text-xs font-bold text-white dark:bg-[#00C2E8] dark:text-[#063251]">
                1
              </div>
              <div>
                <h2 className="text-[16px] font-bold leading-tight text-[#07365A] dark:text-white">
                  {t("exports.selectDataToExport") || "Select data to export"}
                </h2>
                <p className="text-[12px] text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.chooseDatasetToPull") || "Choose the dataset to pull directly from the database."}
                </p>
              </div>
            </div>

            {/* 4 DATASET CARDS */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* EMPLOYEES */}
              <button
                type="button"
                onClick={() => setSelectedScope("employees")}
                className={`group flex min-h-[175px] flex-col justify-between rounded-xl p-4 sm:p-4.5 text-left transition-all ${
                  selectedScope === "employees"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF5FC] text-[#0879D9] dark:bg-[#10354C] dark:text-[#00C2E8]">
                      <Users size={20} strokeWidth={2} />
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedScope === "employees"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedScope === "employees" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-[15px] font-bold text-[#07365A] dark:text-white">
                    {t("exports.employees") || "Employees"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.employeesDesc") || "Profiles, job roles, department assignments, total tasks count, and completion rates."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2ECF2] pt-2.5 text-xs dark:border-[#1A415C]">
                  <span className="font-medium text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.availableRecords") || "Available records"}
                  </span>
                  <span className="rounded-md bg-[#EAF5FC] px-2.5 py-0.5 text-[11.5px] font-bold text-[#0879D9] dark:bg-[#10354C] dark:text-[#00C2E8]">
                    {loadingStats ? "—" : stats.totalEmployees} {t("exports.records") || "records"}
                  </span>
                </div>
              </button>

              {/* TASKS */}
              <button
                type="button"
                onClick={() => setSelectedScope("tasks")}
                className={`group flex min-h-[175px] flex-col justify-between rounded-xl p-4 sm:p-4.5 text-left transition-all ${
                  selectedScope === "tasks"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]">
                      <ClipboardCheck size={20} strokeWidth={2} />
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedScope === "tasks"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedScope === "tasks" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-[15px] font-bold text-[#07365A] dark:text-white">
                    {t("exports.tasks") || "Tasks"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.tasksDesc") || "Task titles, descriptions, assignees, status, priority levels, and due dates."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2ECF2] pt-2.5 text-xs dark:border-[#1A415C]">
                  <span className="font-medium text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.availableRecords") || "Available records"}
                  </span>
                  <span className="rounded-md bg-[#EEF4FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]">
                    {loadingStats ? "—" : stats.totalTasks} {t("exports.records") || "records"}
                  </span>
                </div>
              </button>

              {/* REPORTS */}
              <button
                type="button"
                onClick={() => setSelectedScope("reports")}
                className={`group flex min-h-[175px] flex-col justify-between rounded-xl p-4 sm:p-4.5 text-left transition-all ${
                  selectedScope === "reports"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F3FF] text-[#7C3AED] dark:bg-[#251B4E] dark:text-[#A78BFA]">
                      <BarChart3 size={20} strokeWidth={2} />
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedScope === "reports"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedScope === "reports" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-[15px] font-bold text-[#07365A] dark:text-white">
                    {t("exports.reports") || "Reports"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    Executive performance summaries, task metrics, and department throughput analytics.
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2ECF2] pt-2.5 text-xs dark:border-[#1A415C]">
                  <span className="font-medium text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.availableRecords") || "Available records"}
                  </span>
                  <span className="rounded-md bg-[#F5F3FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#7C3AED] dark:bg-[#251B4E] dark:text-[#A78BFA]">
                    {loadingStats ? "—" : stats.totalTasks} {t("exports.records") || "records"}
                  </span>
                </div>
              </button>

              {/* ALL DATA */}
              <button
                type="button"
                onClick={() => setSelectedScope("all")}
                className={`group flex min-h-[175px] flex-col justify-between rounded-xl p-4 sm:p-4.5 text-left transition-all ${
                  selectedScope === "all"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F8F5] text-[#00A878] dark:bg-[#0D3631] dark:text-[#38DFBE]">
                      <Layers size={20} strokeWidth={2} />
                    </div>

                    {/* Radio Indicator */}
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedScope === "all"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedScope === "all" && (
                        <div className="h-2.5 w-2.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-[15px] font-bold text-[#07365A] dark:text-white">
                    {t("exports.allData") || "All Data"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.allDataDesc") || "Complete database bundle combining both employees and tasks in a unified export."}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#E2ECF2] pt-2.5 text-xs dark:border-[#1A415C]">
                  <span className="font-medium text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.totalBundle") || "Total bundle"}
                  </span>
                  <span className="rounded-md bg-[#E8F8F5] px-2.5 py-0.5 text-[11.5px] font-bold text-[#00A878] dark:bg-[#0D3631] dark:text-[#38DFBE]">
                    {loadingStats ? "—" : stats.totalEmployees + stats.totalTasks} {t("exports.records") || "records"}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* -----------------------------------------------
              SECTION DIVIDER
          ----------------------------------------------- */}
          <div className="my-6 border-t border-[#E2ECF2] dark:border-[#1A415C]" />

          {/* -----------------------------------------------
              SECTION 2: CHOOSE FILE FORMAT
          ----------------------------------------------- */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#063B61] text-xs font-bold text-white dark:bg-[#00C2E8] dark:text-[#063251]">
                2
              </div>
              <div>
                <h2 className="text-[16px] font-bold leading-tight text-[#07365A] dark:text-white">
                  {t("exports.chooseFileFormat") || "Choose file format"}
                </h2>
                <p className="text-[12px] text-[#66829A] dark:text-[#8CB0C7]">
                  {t("exports.selectFileFormatSuited") || "Select the file format suited for your analysis or backup needs."}
                </p>
              </div>
            </div>

            {/* 4 FORMAT CARDS */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* CSV */}
              <button
                type="button"
                onClick={() => setSelectedFormat("csv")}
                className={`group flex min-h-[130px] flex-col justify-between rounded-xl p-4 text-left transition-all ${
                  selectedFormat === "csv"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#107C41] dark:bg-[#113821] dark:text-[#4ADE80]">
                    <FileText size={18} strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#EFF4F7] px-2 py-0.5 text-[10.5px] font-bold text-[#66829A] dark:bg-[#143247] dark:text-[#8CB0C7]">
                      .csv
                    </span>
                    <div
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedFormat === "csv"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedFormat === "csv" && (
                        <div className="h-2 w-2 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mt-2 text-[14.5px] font-bold text-[#07365A] dark:text-white">
                    CSV
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.csvDesc") || "RFC-4180 standard table with UTF-8 BOM encoding."}
                  </p>
                </div>
              </button>

              {/* EXCEL */}
              <button
                type="button"
                onClick={() => setSelectedFormat("xlsx")}
                className={`group flex min-h-[130px] flex-col justify-between rounded-xl p-4 text-left transition-all ${
                  selectedFormat === "xlsx"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#107C41] dark:bg-[#113821] dark:text-[#4ADE80]">
                    <FileSpreadsheet size={18} strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#EFF4F7] px-2 py-0.5 text-[10.5px] font-bold text-[#66829A] dark:bg-[#143247] dark:text-[#8CB0C7]">
                      .xlsx
                    </span>
                    <div
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedFormat === "xlsx"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedFormat === "xlsx" && (
                        <div className="h-2 w-2 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mt-2 text-[14.5px] font-bold text-[#07365A] dark:text-white">
                    Excel
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.excelDesc") || "Styled spreadsheet with multi-sheet support."}
                  </p>
                </div>
              </button>

              {/* JSON */}
              <button
                type="button"
                onClick={() => setSelectedFormat("json")}
                className={`group flex min-h-[130px] flex-col justify-between rounded-xl p-4 text-left transition-all ${
                  selectedFormat === "json"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF7EB] text-[#F5A623] dark:bg-[#382813] dark:text-[#FBBF24]">
                    <Code2 size={18} strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#EFF4F7] px-2 py-0.5 text-[10.5px] font-bold text-[#66829A] dark:bg-[#143247] dark:text-[#8CB0C7]">
                      .json
                    </span>
                    <div
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedFormat === "json"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedFormat === "json" && (
                        <div className="h-2 w-2 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mt-2 text-[14.5px] font-bold text-[#07365A] dark:text-white">
                    JSON
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.jsonDesc") || "Structured, sanitized payload formatted for developers."}
                  </p>
                </div>
              </button>

              {/* PDF */}
              <button
                type="button"
                onClick={() => setSelectedFormat("pdf")}
                className={`group flex min-h-[130px] flex-col justify-between rounded-xl p-4 text-left transition-all ${
                  selectedFormat === "pdf"
                    ? "border-2 border-[#0879D9] bg-[#F2F9FD] shadow-xs dark:border-[#00C2E8] dark:bg-[#0E3550]/40"
                    : "border border-[#D6E2EB] bg-white hover:border-[#0879D9]/50 dark:border-[#1E435E] dark:bg-[#082030] dark:hover:border-[#00C2E8]/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF0F0] text-[#EF5350] dark:bg-[#3D181A] dark:text-[#F87171]">
                    <FileDown size={18} strokeWidth={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#EFF4F7] px-2 py-0.5 text-[10.5px] font-bold text-[#66829A] dark:bg-[#143247] dark:text-[#8CB0C7]">
                      .pdf
                    </span>
                    <div
                      className={`flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 transition-all ${
                        selectedFormat === "pdf"
                          ? "border-[#0879D9] bg-white dark:border-[#00C2E8] dark:bg-[#06243A]"
                          : "border-[#D6E2EB] bg-white dark:border-[#234B69] dark:bg-[#0B2538]"
                      }`}
                    >
                      {selectedFormat === "pdf" && (
                        <div className="h-2 w-2 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mt-2 text-[14.5px] font-bold text-[#07365A] dark:text-white">
                    PDF
                  </h4>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.pdfDesc") || "Print-ready document with branding and summary tables."}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* -----------------------------------------------
              EXPORT ACTION AREA (CTA PANEL)
          ----------------------------------------------- */}
          <div className="mt-6 rounded-xl border border-[#CFE3F1] bg-[#F0F7FD] p-4.5 sm:p-5 dark:border-[#1A4B6B] dark:bg-[#0D2A3E]">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              {/* Left Info */}
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#063B61] text-white shadow-xs">
                  <Download size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.readyToExport") || "Ready to export"}
                  </p>
                  <p className="mt-0.5 text-[15px] sm:text-[16px] font-bold text-[#07365A] dark:text-white">
                    {t("exports.exportingInFormat", {
                      scope: scopeNames[selectedScope],
                      format: formatNames[selectedFormat].label,
                    }) || (
                      <>
                        Exporting{" "}
                        <span className="text-[#0879D9] dark:text-[#00C2E8]">
                          {scopeNames[selectedScope]}
                        </span>{" "}
                        in{" "}
                        <span className="text-[#0879D9] dark:text-[#00C2E8]">
                          {formatNames[selectedFormat].label}
                        </span>{" "}
                        format
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[#66829A] dark:text-[#8CB0C7]">
                    {t("exports.exportIncludesRecords", { count: currentRecordCount }) ||
                      `Includes ${currentRecordCount} database records · Automatic file download`}
                  </p>
                </div>
              </div>

              {/* Right CTA Button */}
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExport}
                className="flex h-[46px] w-full md:w-[230px] shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#063B61] px-6 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-[#042A45] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00C2E8] dark:text-[#063251] dark:hover:bg-[#1CD2F5]"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>{t("exports.preparingExport") || "Preparing export..."}</span>
                  </>
                ) : (
                  <>
                    <Download size={17} strokeWidth={2.4} />
                    <span>
                      {t("exports.exportButton", { scope: scopeNames[selectedScope] }) ||
                        `Export ${scopeNames[selectedScope]}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            THREE COMPACT SECONDARY INFORMATION CARDS
        ================================================= */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          {/* CARD 1 */}
          <div className="flex h-14 items-center gap-3 rounded-xl border border-[#D6E2EB] bg-white px-3.5 py-2.5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF7EE] text-[#107C41] dark:bg-[#113821] dark:text-[#4ADE80]">
              <Lock size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-bold text-[#07365A] dark:text-white leading-tight">
                {t("exports.credentialSanitization") || "Credential Sanitization"}
              </h4>
              <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7] truncate leading-tight mt-0.5">
                {t("exports.credentialSanitizationDesc") || "Passwords, tokens, and security hashes are stripped"}
              </p>
            </div>
          </div>

          {/* CARD 2 */}
          <div className="flex h-14 items-center gap-3 rounded-xl border border-[#D6E2EB] bg-white px-3.5 py-2.5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#2F7BE5] dark:bg-[#142A4A] dark:text-[#6FA2F4]">
              <Database size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-bold text-[#07365A] dark:text-white leading-tight">
                {t("exports.liveMongoDbSource") || "Live MongoDB Source"}
              </h4>
              <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7] truncate leading-tight mt-0.5">
                {t("exports.liveMongoDbSourceDesc") || "Real-time extraction directly from database models"}
              </p>
            </div>
          </div>

          {/* CARD 3 */}
          <div className="flex h-14 items-center gap-3 rounded-xl border border-[#D6E2EB] bg-white px-3.5 py-2.5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8F8F5] text-[#00A878] dark:bg-[#0D3631] dark:text-[#38DFBE]">
              <FileCheck size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <h4 className="text-[12.5px] font-bold text-[#07365A] dark:text-white leading-tight">
                {t("exports.directBrowserStream") || "Direct Browser Stream"}
              </h4>
              <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7] truncate leading-tight mt-0.5">
                {t("exports.directBrowserStreamDesc") || "Clean automatic filenames with UTF-8 support"}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}
        <footer className="mt-6 flex flex-col justify-between gap-2 border-t border-[#D6E2EB] py-4 text-[12px] text-[#7A93A4] dark:border-[#1E435E] dark:text-[#658296] sm:flex-row">
          <p>{t("exports.rightsReserved") || "© 2026 MindMatrix Workforce Management. All rights reserved."}</p>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-[#00A878]" />
            <span>{t("exports.secureAdminEnvironment") || "Secure Administrative Environment"}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
