"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Save,
  Zap,
} from "lucide-react";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import {
  PageHeader,
  SectionCard,
  StatusBadge,
  PriorityBadge,
  LoadingState,
  ErrorState,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

// =====================================================
// HELPERS
// =====================================================

const normalizeStatus = (status?: string): TaskStatus => {
  const value = String(status || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (value === "IN_PROGRESS") return "IN_PROGRESS";
  if (value === "COMPLETED") return "COMPLETED";
  return "PENDING";
};

const formatDate = (date?: string, language: string = "en") => {
  if (!date) return language === "hi" ? "कोई देय तिथि नहीं" : "No due date";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return language === "hi" ? "अमान्य तिथि" : "Invalid date";

  return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// =====================================================
// TASK DETAIL PAGE COMPONENT
// =====================================================

export default function EmployeeTaskPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const taskId = typeof params?.id === "string" ? params.id : "";

  const [task, setTask] = useState<Task | null>(null);
  const [status, setStatus] = useState<TaskStatus>("PENDING");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchTask = async () => {
      if (!taskId) {
        setError(t("taskIdIsMissing") || "Task ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await apiRequest<any>(
          `/api/tasks/${encodeURIComponent(taskId)}`,
          { method: "GET" }
        );

        const fetchedTask =
          response?.data?.task || response?.task || response?.data || null;

        if (!fetchedTask || !fetchedTask._id) {
          throw new Error("Task not found.");
        }

        if (!mounted) return;

        setTask(fetchedTask);
        setStatus(normalizeStatus(fetchedTask.status));
      } catch (err: any) {
        console.error("[EMPLOYEE TASK] Load failed:", err);
        if (!mounted) return;
        setError(err?.message || "Unable to load task.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchTask();

    return () => {
      mounted = false;
    };
  }, [taskId, t]);

  const handleStatusUpdate = async () => {
    if (!taskId || !task) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await apiRequest<any>(
        `/api/tasks/${encodeURIComponent(taskId)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      const updatedTask = response?.data?.task || response?.task || null;

      setTask((current) => ({
        ...(current || task),
        ...(updatedTask || {}),
        status,
      }));

      const successMsg =
        response?.message || "Task status updated successfully.";
      setSuccess(successMsg);
      showToast.success(successMsg);
    } catch (err: any) {
      console.error("[EMPLOYEE TASK] Status update failed:", err);
      const errorMsg = err?.message || "Unable to update task status.";
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading task details..." rows={5} />;
  }

  if (error && !task) {
    return (
      <div className="mx-auto max-w-md py-12">
        <ErrorState
          message={error}
          onRetry={() => router.push("/dashboard/tasks")}
        />
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* =================================================
          PAGE HEADER
      ================================================= */}
      <PageHeader
        title={task.title}
        subtitle="Review assignment specifications and update execution status"
        eyebrow="TASK DETAILS"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "My Tasks", href: "/dashboard/tasks" },
          { label: "Task Details" },
        ]}
        actions={
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>{t("common.back") || "Back to Tasks"}</span>
          </Link>
        }
      />

      {/* =================================================
          TOP SUMMARY HERO CARD
      ================================================= */}
      <div className="rounded-[14px] border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={task.priority} />
              <StatusBadge status={task.status || "PENDING"} />
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-bold text-[#0F172A] dark:text-white">
              {task.title}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs dark:border-[#1E3A47] dark:bg-[#102A36]">
            <CalendarDays size={16} className="text-[#2563EB] dark:text-[#38BDF8]" />
            <span className="font-semibold text-[#64748B] dark:text-[#CBD5E1]">Due Date:</span>
            <span className="font-bold text-[#0F172A] dark:text-white">
              {formatDate(task.dueDate, language)}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================
          2-COLUMN DETAIL LAYOUT
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLS: DESCRIPTION & STATUS CHANGER */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <SectionCard
            title="Task Description & Scope"
            subtitle="Details and instructions provided for this assignment"
            icon={FileText}
          >
            {task.description ? (
              <div className="prose prose-sm max-w-none text-xs sm:text-[13px] leading-relaxed text-[#475569] dark:text-[#CBD5E1]">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            ) : (
              <p className="text-xs italic text-[#64748B] dark:text-[#94A3B8]">
                No detailed description was provided for this task.
              </p>
            )}
          </SectionCard>

          {/* Status Update Control */}
          <SectionCard
            title="Update Progress Status"
            subtitle="Keep your team and administrators informed of your progress"
            icon={RefreshCw}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#CBD5E1] mb-2">
                  Select Status
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                        status === st
                          ? "border-[#2563EB] bg-[#EFF6FF] font-bold text-[#1D4ED8] shadow-xs dark:border-[#38BDF8] dark:bg-[#0C3345] dark:text-[#38BDF8]"
                          : "border-[#CBD5E1] bg-white font-medium text-[#64748B] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1]"
                      }`}
                    >
                      {st === "PENDING" && <Clock3 size={18} className="mb-1 text-[#D97706]" />}
                      {st === "IN_PROGRESS" && <CircleDot size={18} className="mb-1 text-[#0284C7] dark:text-[#38BDF8]" />}
                      {st === "COMPLETED" && <CheckCircle2 size={18} className="mb-1 text-[#00A878]" />}
                      <span className="text-xs">
                        {st === "PENDING" ? "Pending" : st === "IN_PROGRESS" ? "In Progress" : "Completed"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Alert */}
              {success && (
                <div className="rounded-xl border border-emerald-300 bg-[#ECFDF5] p-3 text-xs font-semibold text-[#00875A] dark:border-emerald-700 dark:bg-[#064E3B]/60 dark:text-[#34D399]">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-xl border border-rose-300 bg-[#FEF2F2] p-3 text-xs font-semibold text-[#DC2626] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                  {error}
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  onClick={handleStatusUpdate}
                  disabled={saving || status === normalizeStatus(task.status)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#063B61] hover:bg-[#042741] px-5 py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer dark:bg-[#0879D9] dark:hover:bg-[#0665B5]"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t("common.saving") || "Saving..."}</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{t("common.saveChanges") || "Save Status"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT 1 COL: METADATA */}
        <div className="space-y-6">
          <SectionCard
            title="Assignment Metadata"
            subtitle="Auditing & scheduling parameters"
            icon={Zap}
          >
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5 dark:border-[#18333F]">
                <span className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Priority Level</span>
                <PriorityBadge priority={task.priority} />
              </div>

              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5 dark:border-[#18333F]">
                <span className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Current Status</span>
                <StatusBadge status={task.status || "PENDING"} size="sm" />
              </div>

              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5 dark:border-[#18333F]">
                <span className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Due Date</span>
                <span className="font-bold text-[#0F172A] dark:text-white">
                  {formatDate(task.dueDate, language)}
                </span>
              </div>

              {task.createdAt && (
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5 dark:border-[#18333F]">
                  <span className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Created On</span>
                  <span className="font-medium text-[#0F172A] dark:text-white">
                    {formatDate(task.createdAt, language)}
                  </span>
                </div>
              )}

              {task.updatedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#64748B] dark:text-[#CBD5E1]">Last Updated</span>
                  <span className="font-medium text-[#0F172A] dark:text-white">
                    {formatDate(task.updatedAt, language)}
                  </span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
