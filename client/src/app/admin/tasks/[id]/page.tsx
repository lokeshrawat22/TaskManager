"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  FileText,
  Flag,
  Info,
  Loader2,
  Pencil,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

// =====================================================
// TYPES
// =====================================================

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Person {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
}

interface Task {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: Person | string | null;
  assignedTo?: Person | string | null;
}

interface TaskResponse {
  success?: boolean;
  message?: string;
  data?:
    | Task
    | {
        task?: Task;
      };
}

// =====================================================
// HELPERS
// =====================================================

function getPersonName(person?: Person | string | null): string {
  if (!person) {
    return "Unknown";
  }

  if (typeof person === "string") {
    return person;
  }

  const fullName = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    person.name ||
    person.employeeId ||
    person.email ||
    "Unknown"
  );
}

function getPersonEmail(person?: Person | string | null): string {
  if (!person || typeof person === "string") {
    return "";
  }

  return person.email || "";
}

function getPersonInitials(name: string): string {
  if (!name || name === "Unknown") return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(date?: string | null, language: string = "en"): string {
  if (!date) {
    return language === "hi" ? "उपलब्ध नहीं" : "Not available";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return language === "hi" ? "अमान्य तिथि" : "Invalid date";
  }

  return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date?: string | null, language: string = "en"): string {
  if (!date) {
    return language === "hi" ? "उपलब्ध नहीं" : "Not available";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return language === "hi" ? "अमान्य तिथि" : "Invalid date";
  }

  return parsed.toLocaleString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === "COMPLETED") {
    return false;
  }

  return new Date(task.dueDate).getTime() < Date.now();
}

// =====================================================
// BADGES
// =====================================================

function StatusBadge({ status }: { status?: TaskStatus }) {
  const { t, language } = useLanguage();

  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-[#EAF9F4] px-3 py-1 text-xs font-bold text-[#159779] shadow-xs dark:border-emerald-800/60 dark:bg-[#123C34] dark:text-[#6BE0C2]">
        <CheckCircle2 size={13} />
        {t("status.completed") || (language === "hi" ? "पूर्ण" : "Completed")}
      </span>
    );
  }

  if (status === "IN_PROGRESS") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200/80 bg-[#EEF4FF] px-3 py-1 text-xs font-bold text-[#3879D5] shadow-xs dark:border-sky-800/60 dark:bg-[#172D49] dark:text-[#78A9F0]">
        <Clock3 size={13} />
        {t("status.in_progress") || (language === "hi" ? "प्रगति पर" : "In Progress")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-[#FFF5E7] px-3 py-1 text-xs font-bold text-[#D99021] shadow-xs dark:border-amber-800/60 dark:bg-[#3A2B13] dark:text-[#F2B94B]">
      <Clock3 size={13} />
      {t("status.pending") || (language === "hi" ? "लंबित" : "Pending")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority?: TaskPriority }) {
  const { t } = useLanguage();

  const styles: Record<
    TaskPriority,
    { badge: string; icon: string }
  > = {
    LOW: {
      badge:
        "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-[#1E293B] dark:text-slate-300",
      icon: "text-slate-500 dark:text-slate-400",
    },
    MEDIUM: {
      badge:
        "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
      icon: "text-sky-600 dark:text-sky-400",
    },
    HIGH: {
      badge:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
      icon: "text-amber-600 dark:text-amber-400",
    },
    URGENT: {
      badge:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
      icon: "text-rose-600 dark:text-rose-400",
    },
  };

  const currentPriority = priority || "MEDIUM";
  const currentStyle = styles[currentPriority];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-xs ${currentStyle.badge}`}
    >
      <Flag size={12} className={currentStyle.icon} />
      {t(`priority.${currentPriority.toLowerCase()}`) || currentPriority}
    </span>
  );
}

// =====================================================
// PAGE COMPONENT
// =====================================================

export default function TaskDetailsPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  // ===================================================
  // FETCH TASK
  // ===================================================

  useEffect(() => {
    if (!taskId) {
      setError(language === "hi" ? "कार्य आईडी अनुपलब्ध है।" : "Task ID is missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadTask = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest<TaskResponse>(
          `/api/tasks/${encodeURIComponent(taskId)}`,
          {
            method: "GET",
          },
        );

        if (!mounted) return;

        const data = response?.data;
        const currentTask =
          data && typeof data === "object" && "task" in data
            ? data.task
            : data;

        if (!currentTask) {
          throw new Error(language === "hi" ? "कार्य नहीं मिला।" : "Task not found.");
        }

        setTask(currentTask as Task);
      } catch (err: unknown) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : (language === "hi" ? "कार्य लोड करने में विफल।" : "Failed to load task."),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTask();

    return () => {
      mounted = false;
    };
  }, [taskId, language]);

  // ===================================================
  // UPDATE STATUS
  // ===================================================

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task?._id && !task?.id) return;
    if (task.status === newStatus) return;

    try {
      setStatusUpdating(true);
      setError("");
      setSuccess("");

      const id = task._id || task.id;

      const response = await apiRequest<any>(
        `/api/tasks/${encodeURIComponent(id!)}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        },
      );

      const updatedTask = response?.data?.task || response?.data;

      if (updatedTask && typeof updatedTask === "object") {
        setTask((prev) =>
          prev
            ? {
                ...prev,
                ...updatedTask,
                status: newStatus,
                completedAt:
                  newStatus === "COMPLETED"
                    ? updatedTask.completedAt || new Date().toISOString()
                    : updatedTask.completedAt ?? null,
              }
            : prev,
        );
      } else {
        setTask((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                completedAt:
                  newStatus === "COMPLETED"
                    ? new Date().toISOString()
                    : prev.completedAt,
              }
            : prev,
        );
      }

      const successMsg =
        response?.message || (language === "hi" ? "कार्य स्थिति सफलतापूर्वक अपडेट की गई।" : "Task status updated successfully.");
      setSuccess(successMsg);
      showToast.success(successMsg);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (language === "hi" ? "कार्य स्थिति अपडेट करने में विफल।" : "Failed to update task status.");
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setStatusUpdating(false);
    }
  };

  // ===================================================
  // COPY TASK ID
  // ===================================================

  const handleCopyId = () => {
    if (!task) return;
    const id = task._id || task.id || taskId;
    navigator.clipboard.writeText(id);
    setCopied(true);
    showToast.success(language === "hi" ? "कार्य आईडी क्लिपबोर्ड पर कॉपी हो गई" : "Task ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading) {
    return (
      <main className="relative min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#081C27]">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-[#D8E4EC] bg-white px-6 py-4 text-sm font-semibold text-[#063D63] shadow-sm dark:border-[#3A5F71] dark:bg-[#102A38] dark:text-[#E5F1F5]">
            <Loader2
              size={20}
              className="animate-spin text-[#087D8F] dark:text-[#4CD2DA]"
            />
            {t("tasks.loadingTask") || (language === "hi" ? "कार्य विवरण लोड हो रहा है..." : "Loading task details...")}
          </div>
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR / NOT FOUND
  // ===================================================

  if (!task) {
    return (
      <main className="relative min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#081C27]">
        <div className="mx-auto max-w-lg px-4 py-20">
          <div className="rounded-[14px] border border-[#F2D8D8] bg-white p-8 text-center shadow-sm dark:border-[#5A3438] dark:bg-[#102A38]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7F7] text-xl font-bold text-[#E5484D] dark:bg-[#341F23]">
              !
            </div>

            <h2 className="mt-4 text-xl font-bold text-[#063D63] dark:text-[#E5F1F5]">
              {t("tasks.taskNotFound") || (language === "hi" ? "कार्य नहीं मिला" : "Task Not Found")}
            </h2>

            <p className="mt-2 text-xs sm:text-sm font-medium text-[#6B879B] dark:text-[#8FA8B2]">
              {error || (language === "hi" ? "इस कार्य की जानकारी खोजने या लोड करने में असमर्थ।" : "Unable to find or load this task's information.")}
            </p>

            <button
              type="button"
              onClick={() => router.push("/admin/tasks")}
              className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[#063D63] px-5 py-2.5 text-xs sm:text-[13px] font-bold text-white shadow-sm transition hover:bg-[#052F4D] dark:bg-[#0B2A3A] dark:hover:bg-[#12455C]"
            >
              <ArrowLeft size={15} />
              {t("common.back") || (language === "hi" ? "कार्यों पर वापस जाएं" : "Back to Tasks")}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const overdue = isOverdue(task);
  const assignedName = getPersonName(task.assignedTo);
  const assignedEmail = getPersonEmail(task.assignedTo);
  const createdByName = getPersonName(task.createdBy);
  const createdByEmail = getPersonEmail(task.createdBy);
  const shortTaskId = (task._id || task.id || taskId).slice(-6).toUpperCase();

  // ===================================================
  // MAIN RENDER
  // ===================================================

  return (
    <main className="relative min-h-[calc(100vh-74px)] bg-[#F5F9FC] text-[#063B61] dark:bg-[#081C27] dark:text-[#E5F1F5]">
      {/* BACKGROUND PATTERN */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#D7E7EC 1px, transparent 1px), linear-gradient(90deg, #D7E7EC 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "linear-gradient(to bottom, black, transparent 90%)",
        }}
      />

      <div className="relative mx-auto max-w-[1220px] px-4 py-7 sm:px-6 lg:px-8">
        {/* =================================================
            TOP BAR NAVIGATION & QUICK ACTIONS
        ================================================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push("/admin/tasks")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8E4EC] bg-white text-[#607985] shadow-sm transition hover:bg-[#F5F9FA] hover:text-[#087D8F] dark:border-[#3D6375] dark:bg-[#102A38] dark:text-[#AFC5CE] dark:hover:bg-[#18333F] dark:hover:text-[#4CD2DA]"
              title={language === "hi" ? "कार्यों पर वापस जाएं" : "Back to Tasks"}
              aria-label={language === "hi" ? "कार्यों पर वापस जाएं" : "Back to Tasks"}
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {t("tasks.taskDetails") || (language === "hi" ? "कार्य विवरण" : "TASK DETAILS")}
                </span>
                <span className="rounded bg-[#EAF6F9] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  #{shortTaskId}
                </span>
              </div>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#063D63] sm:text-[28px] dark:text-[#E5F1F5]">
                {task.title}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-[#6B879B] sm:text-[13px] dark:text-[#9FB6C0]">
                {language === "hi"
                  ? "कार्य की जानकारी, असाइनमेंट और प्रगति देखें।"
                  : "View task information, assignment and progress."}
              </p>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyId}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#D8E4EC] bg-white px-3 text-xs font-semibold text-[#607985] shadow-sm transition hover:bg-[#F5F9FA] hover:text-[#063D63] dark:border-[#3D6375] dark:bg-[#102A38] dark:text-[#AFC5CE] dark:hover:bg-[#18333F]"
              title={language === "hi" ? "आईडी कॉपी करें" : "Copy Task ID"}
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[#00A878]" />
                  <span className="text-[#00A878]">{language === "hi" ? "कॉपी हो गया" : "Copied"}</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>{language === "hi" ? "आईडी कॉपी करें" : "Copy ID"}</span>
                </>
              )}
            </button>

            <Link
              href={`/admin/tasks/${taskId}/edit`}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#087D8F]/30 bg-[#EAF6F9] px-3.5 text-xs font-bold text-[#087D8F] shadow-sm transition hover:bg-[#DFF2F5] dark:border-[#4CD2DA]/40 dark:bg-[#123C46] dark:text-[#4CD2DA] dark:hover:bg-[#184855]"
            >
              <Pencil size={13} />
              <span>{t("tasks.editTask") || (language === "hi" ? "कार्य संपादित करें" : "Edit Task")}</span>
            </Link>
          </div>
        </div>

        {/* =================================================
            OVERVIEW KPI STRIP (4 METRIC CARDS)
        ================================================= */}
        <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
          {/* KPI 1: ASSIGNEE */}
          <div className="flex items-center gap-3 rounded-[12px] border border-[#D8E4EC] bg-white p-3.5 shadow-[0_2px_8px_rgba(6,61,99,0.025)] dark:border-[#3A5F71] dark:bg-[#102A38]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-xs font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
              {getPersonInitials(assignedName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                {t("tasks.assignedTo") || (language === "hi" ? "असाइन किया गया" : "Assignee")}
              </p>
              <p className="truncate text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                {assignedName}
              </p>
              <p className="truncate text-[10px] text-[#6B879B] dark:text-[#8FA8B2]">
                {assignedEmail || (language === "hi" ? "प्राथमिक स्वामी" : "Primary owner")}
              </p>
            </div>
          </div>

          {/* KPI 2: CURRENT STATUS */}
          <div className="flex items-center gap-3 rounded-[12px] border border-[#D8E4EC] bg-white p-3.5 shadow-[0_2px_8px_rgba(6,61,99,0.025)] dark:border-[#3A5F71] dark:bg-[#102A38]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#3879D5] dark:bg-[#172D49] dark:text-[#78A9F0]">
              <Clock3 size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                {t("tasks.status") || (language === "hi" ? "स्थिति" : "Status")}
              </p>
              <div className="mt-0.5">
                <StatusBadge status={task.status} />
              </div>
            </div>
          </div>

          {/* KPI 3: PRIORITY */}
          <div className="flex items-center gap-3 rounded-[12px] border border-[#D8E4EC] bg-white p-3.5 shadow-[0_2px_8px_rgba(6,61,99,0.025)] dark:border-[#3A5F71] dark:bg-[#102A38]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E8] text-[#D17E18] dark:bg-[#3A2815] dark:text-[#F0B35B]">
              <Flag size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                {t("tasks.priority") || (language === "hi" ? "प्राथमिकता" : "Priority")}
              </p>
              <div className="mt-0.5">
                <PriorityBadge priority={task.priority} />
              </div>
            </div>
          </div>

          {/* KPI 4: DUE DATE */}
          <div className="flex items-center gap-3 rounded-[12px] border border-[#D8E4EC] bg-white p-3.5 shadow-[0_2px_8px_rgba(6,61,99,0.025)] dark:border-[#3A5F71] dark:bg-[#102A38]">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                overdue
                  ? "bg-rose-100 text-[#E5484D] dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]"
              }`}
            >
              <CalendarDays size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                {language === "hi" ? "लक्षित नियत तिथि" : "Target Due Date"}
              </p>
              <p
                className={`truncate text-xs font-bold ${
                  overdue
                    ? "text-[#E5484D] dark:text-rose-300"
                    : "text-[#063D63] dark:text-[#E5F1F5]"
                }`}
              >
                {formatDate(task.dueDate, language)}
              </p>
              <p
                className={`truncate text-[10px] font-semibold ${
                  overdue
                    ? "text-[#E5484D] dark:text-rose-400"
                    : "text-[#00A878] dark:text-emerald-400"
                }`}
              >
                {overdue
                  ? (language === "hi" ? "समय सीमा समाप्त" : "Overdue deadline")
                  : task.status === "COMPLETED"
                    ? (language === "hi" ? "पूर्ण" : "Completed")
                    : (language === "hi" ? "सक्रिय अनुसूची" : "Active schedule")}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS & NOTIFICATIONS
        ================================================= */}
        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#F2D8D8] bg-[#FFF7F7] p-3.5 dark:border-[#5A3438] dark:bg-[#341F23]">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#E5484D]" />
            <p className="text-xs font-semibold leading-relaxed text-[#B04A4A] dark:text-[#FFA3A3]">
              {error}
            </p>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-[#CDECE3] bg-[#F2FBF8] p-3.5 dark:border-[#365F52] dark:bg-[#123C35]">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#00A878]" />
            <p className="text-xs font-semibold leading-relaxed text-[#00A878]">
              {success}
            </p>
          </div>
        )}

        {/* =================================================
            MAIN CONTENT GRID (65% / 35%)
        ================================================= */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* =================================================
              LEFT COLUMN: TASK OVERVIEW & DATA (65%)
          ================================================= */}
          <div className="space-y-6">
            {/* 1. DESCRIPTION CARD */}
            <section className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <FileText size={17} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                    {language === "hi" ? "कार्य अवलोकन" : "TASK OVERVIEW"}
                  </span>
                  <h2 className="text-[15px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {t("tasks.taskDescription") || (language === "hi" ? "विवरण" : "Description")}
                  </h2>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-4.5 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                <p className="whitespace-pre-wrap text-xs sm:text-[13px] font-medium leading-relaxed text-[#063D63] dark:text-[#E5F1F5]">
                  {task.description || (
                    <span className="italic text-[#8497A1] dark:text-[#8FA8B2]">
                      {language === "hi" ? "इस कार्य के लिए कोई विवरण नहीं दिया गया।" : "No description provided for this task."}
                    </span>
                  )}
                </p>
              </div>
            </section>

            {/* 2. TASK OWNERSHIP & STAKEHOLDERS */}
            <section className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <UserRound size={17} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                    {language === "hi" ? "असाइनमेंट" : "ASSIGNMENT"}
                  </span>
                  <h2 className="text-[15px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {language === "hi" ? "कार्य हितधारक" : "Task Stakeholders"}
                  </h2>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {/* ASSIGNED TO */}
                <div className="rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-4 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF6F9] text-xs font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                      {getPersonInitials(assignedName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                        {t("tasks.assignedTo") || (language === "hi" ? "असाइन किया गया कर्मचारी" : "Assigned Employee")}
                      </p>
                      <p className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                        {assignedName}
                      </p>
                      {assignedEmail && (
                        <p className="mt-0.5 truncate text-[11px] text-[#6B879B] dark:text-[#8FA8B2]">
                          {assignedEmail}
                        </p>
                      )}
                      {typeof task.assignedTo === "object" &&
                        task.assignedTo?.employeeId && (
                          <span className="mt-1.5 inline-block rounded bg-[#EAF6F9] px-2 py-0.5 font-mono text-[10px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                            ID: {task.assignedTo.employeeId}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                {/* CREATED BY */}
                <div className="rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-4 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF4FF] text-xs font-bold text-[#3879D5] dark:bg-[#172D49] dark:text-[#78A9F0]">
                      {getPersonInitials(createdByName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                        {language === "hi" ? "द्वारा निर्मित" : "Created By"}
                      </p>
                      <p className="mt-0.5 truncate text-xs sm:text-[13px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                        {createdByName}
                      </p>
                      {createdByEmail && (
                        <p className="mt-0.5 truncate text-[11px] text-[#6B879B] dark:text-[#8FA8B2]">
                          {createdByEmail}
                        </p>
                      )}
                      <span className="mt-1.5 inline-block rounded bg-[#F5F9FA] px-2 py-0.5 text-[10px] font-semibold text-[#607985] dark:bg-[#18333F] dark:text-[#AFC5CE]">
                        {language === "hi" ? "प्रशासक" : "Administrator"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. LIFECYCLE & TIMELINE */}
            <section className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <CalendarDays size={17} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                    {language === "hi" ? "समय रेखा" : "TIMELINE"}
                  </span>
                  <h2 className="text-[15px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {language === "hi" ? "जीवनचक्र और मील के पत्थर" : "Lifecycle & Milestones"}
                  </h2>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* DUE DATE */}
                <div className="flex items-center gap-3 rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-3.5 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                    <CalendarDays size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                      {language === "hi" ? "लक्षित समय सीमा" : "Target Deadline"}
                    </p>
                    <p className="truncate text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                      {formatDate(task.dueDate, language)}
                    </p>
                    <p
                      className={`text-[10px] font-medium ${
                        overdue
                          ? "font-bold text-[#E5484D] dark:text-rose-400"
                          : "text-[#6B879B] dark:text-[#8FA8B2]"
                      }`}
                    >
                      {overdue
                        ? (language === "hi" ? "समय सीमा समाप्त" : "Past target deadline")
                        : task.status === "COMPLETED"
                          ? (language === "hi" ? "पूर्ण" : "Completed")
                          : (language === "hi" ? "निर्धारित समय सीमा" : "Scheduled deadline")}
                    </p>
                  </div>
                </div>

                {/* CREATED AT */}
                <div className="flex items-center gap-3 rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-3.5 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                    <Clock3 size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                      {language === "hi" ? "निर्माण समय" : "Created At"}
                    </p>
                    <p className="truncate text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                      {formatDateTime(task.createdAt, language)}
                    </p>
                    <p className="text-[10px] text-[#6B879B] dark:text-[#8FA8B2]">
                      {language === "hi" ? "प्रारंभिक रिकॉर्ड निर्माण" : "Initial record creation"}
                    </p>
                  </div>
                </div>

                {/* LAST UPDATED */}
                {task.updatedAt && (
                  <div className="flex items-center gap-3 rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-3.5 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                      <Clock3 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                        {language === "hi" ? "अंतिम अपडेट" : "Last Updated"}
                      </p>
                      <p className="truncate text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                        {formatDateTime(task.updatedAt, language)}
                      </p>
                      <p className="text-[10px] text-[#6B879B] dark:text-[#8FA8B2]">
                        {language === "hi" ? "नवीनतम संशोधन" : "Most recent modification"}
                      </p>
                    </div>
                  </div>
                )}

                {/* COMPLETED AT */}
                {task.completedAt && (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/40 p-3.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#00A878] dark:bg-emerald-900/60 dark:text-emerald-300">
                      <CheckCircle2 size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        {language === "hi" ? "पूर्ण होने का समय" : "Completed At"}
                      </p>
                      <p className="truncate text-xs font-bold text-emerald-900 dark:text-emerald-100">
                        {formatDateTime(task.completedAt, language)}
                      </p>
                      <p className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
                        {language === "hi" ? "कार्य पूर्ण चिह्नित" : "Task marked done"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* =================================================
              RIGHT COLUMN: CONTROLS & METADATA (35%)
          ================================================= */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* 1. STATUS CONTROLLER CARD */}
            <div className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {language === "hi" ? "कार्य प्रगति" : "TASK PROGRESS"}
                </span>
                <h2 className="text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                  {language === "hi" ? "स्थिति अपडेट करें" : "Update Status"}
                </h2>
              </div>

              <div className="mt-3.5 space-y-2">
                {(
                  [
                    "PENDING",
                    "IN_PROGRESS",
                    "COMPLETED",
                  ] as TaskStatus[]
                ).map((status) => {
                  const active = task.status === status;

                  const labels: Record<TaskStatus, string> = {
                    PENDING: t("status.pending") || (language === "hi" ? "लंबित" : "Pending"),
                    IN_PROGRESS: t("status.in_progress") || (language === "hi" ? "प्रगति पर" : "In Progress"),
                    COMPLETED: t("status.completed") || (language === "hi" ? "पूर्ण" : "Completed"),
                  };

                  const activeStyles: Record<TaskStatus, string> = {
                    PENDING:
                      "border-amber-300 bg-amber-50/90 text-amber-800 shadow-xs ring-1 ring-amber-300/30 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300",
                    IN_PROGRESS:
                      "border-sky-300 bg-sky-50/90 text-sky-800 shadow-xs ring-1 ring-sky-300/30 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-300",
                    COMPLETED:
                      "border-emerald-300 bg-emerald-50/90 text-emerald-800 shadow-xs ring-1 ring-emerald-300/30 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300",
                  };

                  return (
                    <button
                      key={status}
                      type="button"
                      disabled={statusUpdating || active}
                      onClick={() => handleStatusChange(status)}
                      className={`group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-[13px] font-semibold transition-all ${
                        active
                          ? activeStyles[status]
                          : "border-[#D8E4EC] bg-white text-[#607985] hover:border-[#087D8F] hover:bg-[#F5F9FC] hover:text-[#063D63] dark:border-[#3A5F71] dark:bg-[#102A38] dark:text-[#AFC5CE] dark:hover:border-[#4CD2DA] dark:hover:bg-[#18333F]"
                      } disabled:cursor-not-allowed disabled:opacity-75`}
                    >
                      <span className="flex items-center gap-2.5">
                        {status === "COMPLETED" ? (
                          <CheckCircle2
                            size={15}
                            className={
                              active
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[#8497A1] group-hover:text-[#087D8F]"
                            }
                          />
                        ) : (
                          <Clock3
                            size={15}
                            className={
                              active
                                ? status === "IN_PROGRESS"
                                  ? "text-sky-600 dark:text-sky-400"
                                  : "text-amber-600 dark:text-amber-400"
                                : "text-[#8497A1] group-hover:text-[#087D8F]"
                            }
                          />
                        )}
                        <span>{labels[status]}</span>
                      </span>

                      {active && (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-inherit shadow-xs dark:bg-black/40">
                          {language === "hi" ? "वर्तमान" : "CURRENT"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {statusUpdating && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[#087D8F] dark:text-[#4CD2DA]">
                  <Loader2 size={14} className="animate-spin" />
                  <span>{language === "hi" ? "स्थिति अपडेट हो रही है..." : "Updating status..."}</span>
                </div>
              )}
            </div>

            {/* 2. OVERDUE ALERT BANNER (IF OVERDUE) */}
            {overdue && (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50/90 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-[#E5484D] dark:bg-rose-950/60 dark:text-rose-300">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                      {language === "hi" ? "कार्य की समय सीमा समाप्त हो गई है" : "Task is overdue"}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-rose-700/90 dark:text-rose-300/80">
                      {language === "hi" ? (
                        <>
                          नियत तिथि{" "}
                          <span className="font-bold">
                            {formatDate(task.dueDate, language)}
                          </span>{" "}
                          थी। कृपया कार्य की स्थिति अपडेट करें या पुनः निर्धारित करें।
                        </>
                      ) : (
                        <>
                          The due date was{" "}
                          <span className="font-bold">
                            {formatDate(task.dueDate, language)}
                          </span>
                          . Please update the task status or reschedule.
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PRIORITY GUIDANCE CARD */}
            <div className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {language === "hi" ? "प्राथमिकता" : "PRIORITY"}
                </span>
                <h2 className="text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                  {t("tasks.priority") || (language === "hi" ? "कार्य प्राथमिकता" : "Task Priority")}
                </h2>
              </div>

              <div className="mt-3.5">
                <PriorityBadge priority={task.priority} />
                <p className="mt-2.5 text-xs leading-relaxed text-[#6B879B] dark:text-[#8FA8B2]">
                  {language === "hi"
                    ? "प्राथमिकता यह निर्धारित करती है कि इस कार्य को कितनी तात्कालिकता से संभाला जाना चाहिए।"
                    : "Priority determines how urgently this task should be handled and informs SLA scheduling."}
                </p>
              </div>
            </div>

            {/* 4. SYSTEM REFERENCE METADATA CARD */}
            <div className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                  {language === "hi" ? "संदर्भ" : "REFERENCE"}
                </span>
                <h2 className="text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                  {language === "hi" ? "सिस्टम मेटाडेटा" : "System Metadata"}
                </h2>
              </div>

              <div className="mt-3.5 space-y-2.5">
                <div className="rounded-lg border border-[#E8EFF3] bg-[#FBFDFE] p-3 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                      {language === "hi" ? "कार्य आईडी" : "Task ID"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="text-[10px] font-bold text-[#087D8F] hover:underline dark:text-[#4CD2DA]"
                    >
                      {language === "hi" ? "कॉपी" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-1 select-all break-all font-mono text-xs font-semibold text-[#063D63] dark:text-[#E5F1F5]">
                    {task._id || task.id || taskId}
                  </p>
                </div>

                {typeof task.assignedTo === "object" &&
                  task.assignedTo?.employeeId && (
                    <div className="rounded-lg border border-[#E8EFF3] bg-[#FBFDFE] p-3 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                        {t("employees.employeeId") || (language === "hi" ? "कर्मचारी आईडी" : "Employee ID")}
                      </span>
                      <p className="mt-1 font-mono text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                        {task.assignedTo.employeeId}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}