"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPen,
  FileText,
  Flag,
  Info,
  Loader2,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

// =====================================================
// TYPES
// =====================================================

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Employee {
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

interface EmployeeResponse {
  success?: boolean;
  data?:
    | Employee[]
    | {
        employees?: Employee[];
      };
}

interface FieldErrors {
  title?: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
}

// =====================================================
// HELPERS
// =====================================================

function getEmployeeId(employee: Employee): string {
  return employee._id || employee.id || "";
}

function getEmployeeName(employee: Employee): string {
  const fullName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    employee.name ||
    fullName ||
    employee.employeeId ||
    employee.email ||
    "Employee"
  );
}

function getEmployeeInitials(employee: Employee): string {
  const first = (employee.firstName || employee.name || "").charAt(0);
  const last = (employee.lastName || "").charAt(0);
  return (first + last).toUpperCase() || "?";
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPreviewDate(dateStr: string, language: string = "en"): string {
  if (!dateStr) return language === "hi" ? "चयनित नहीं" : "Not selected";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, monthIndex, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

function filterEmployees(employees: Employee[], query: string): Employee[] {
  const q = query.toLowerCase().trim();
  if (!q) return employees;

  return employees.filter((emp) => {
    const fullName = getEmployeeName(emp).toLowerCase();
    const firstName = (emp.firstName || "").toLowerCase();
    const lastName = (emp.lastName || "").toLowerCase();
    const department = (emp.department || "").toLowerCase();
    const empId = (emp.employeeId || "").toLowerCase();
    const designation = (emp.designation || "").toLowerCase();

    return (
      fullName.includes(q) ||
      firstName.includes(q) ||
      lastName.includes(q) ||
      department.includes(q) ||
      empId.includes(q) ||
      designation.includes(q)
    );
  });
}

// =====================================================
// PRIORITY METADATA CONFIG
// =====================================================

const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    pillActiveBg: string;
    pillActiveBorder: string;
    flagColor: string;
  }
> = {
  LOW: {
    label: "Low",
    badgeBg: "bg-slate-100 dark:bg-[#1E293B]",
    badgeText: "text-slate-600 dark:text-slate-300",
    badgeBorder: "border-slate-200 dark:border-slate-700",
    pillActiveBg: "bg-slate-100 text-slate-800 dark:bg-[#1E293B] dark:text-slate-200",
    pillActiveBorder: "border-slate-400 dark:border-slate-500 ring-1 ring-slate-400/20",
    flagColor: "text-slate-500 dark:text-slate-400",
  },
  MEDIUM: {
    label: "Medium",
    badgeBg: "bg-sky-50 dark:bg-sky-950/40",
    badgeText: "text-sky-700 dark:text-sky-300",
    badgeBorder: "border-sky-200 dark:border-sky-800",
    pillActiveBg: "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
    pillActiveBorder: "border-sky-400 dark:border-sky-500 ring-1 ring-sky-400/20",
    flagColor: "text-sky-600 dark:text-sky-400",
  },
  HIGH: {
    label: "High",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    pillActiveBg: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
    pillActiveBorder: "border-amber-400 dark:border-amber-500 ring-1 ring-amber-400/20",
    flagColor: "text-amber-600 dark:text-amber-400",
  },
  URGENT: {
    label: "Urgent",
    badgeBg: "bg-rose-50 dark:bg-rose-950/40",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBorder: "border-rose-200 dark:border-rose-800",
    pillActiveBg: "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
    pillActiveBorder: "border-rose-400 dark:border-rose-500 ring-1 ring-rose-400/20",
    flagColor: "text-rose-600 dark:text-rose-400",
  },
};

// =====================================================
// PAGE COMPONENT
// =====================================================

export default function CreateTaskPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  // ===================================================
  // FORM STATE
  // ===================================================

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  // Inline field errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ===================================================
  // EMPLOYEES
  // ===================================================

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  // ===================================================
  // DROPDOWN STATE
  // ===================================================

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);

  // ===================================================
  // UI STATE
  // ===================================================

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ===================================================
  // CLICK OUTSIDE HANDLER
  // ===================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setEmployeeSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isDropdownOpen]);

  // ===================================================
  // FETCH EMPLOYEES
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      try {
        setEmployeesLoading(true);
        setError("");

        const response = await apiRequest<EmployeeResponse>(
          "/api/users/employees",
          {
            method: "GET",
          },
        );

        if (!mounted) return;

        const data = response?.data;
        const list = Array.isArray(data) ? data : (data?.employees ?? []);

        setEmployees(list);
      } catch (err) {
        if (!mounted) return;

        const errorMsg =
          err instanceof Error
            ? err.message
            : (language === "hi" ? "कर्मचारियों को लोड करने में विफल।" : "Failed to load employees.");
        setError(errorMsg);
        showToast.error(errorMsg);
      } finally {
        if (mounted) {
          setEmployeesLoading(false);
        }
      }
    };

    loadEmployees();

    return () => {
      mounted = false;
    };
  }, [language]);

  // ===================================================
  // EMPLOYEE SELECTION HANDLERS
  // ===================================================

  const toggleEmployee = (empId: string) => {
    setAssignedTo((prev) => {
      const next = prev.includes(empId)
        ? prev.filter((id) => id !== empId)
        : [...prev, empId];

      if (next.length > 0) {
        setFieldErrors((errs) => ({ ...errs, assignedTo: undefined }));
      }
      return next;
    });
  };

  const removeEmployee = (empId: string) => {
    setAssignedTo((prev) => {
      const next = prev.filter((id) => id !== empId);
      if (next.length === 0) {
        setFieldErrors((errs) => ({
          ...errs,
          assignedTo:
            language === "hi" ? "कृपया कम से कम एक कर्मचारी चुनें।" : "Please select at least one employee.",
        }));
      }
      return next;
    });
  };

  const clearAllEmployees = () => {
    setAssignedTo([]);
    setFieldErrors((errs) => ({
      ...errs,
      assignedTo:
        language === "hi" ? "कृपया कम से कम एक कर्मचारी चुनें।" : "Please select at least one employee.",
    }));
  };

  // ===================================================
  // COMPUTED VALUES
  // ===================================================

  const filteredEmployees = filterEmployees(employees, employeeSearch);

  const selectedEmployees = employees.filter((emp) =>
    assignedTo.includes(getEmployeeId(emp)),
  );

  // ===================================================
  // FORM VALIDATION & SUBMISSION
  // ===================================================

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      errors.title = language === "hi" ? "कार्य शीर्षक आवश्यक है।" : "Task title is required.";
    } else if (trimmedTitle.length < 3) {
      errors.title =
        language === "hi" ? "कार्य शीर्षक कम से कम 3 वर्णों का होना चाहिए।" : "Task title must be at least 3 characters.";
    } else if (trimmedTitle.length > 200) {
      errors.title =
        language === "hi" ? "कार्य शीर्षक 200 वर्णों से अधिक नहीं हो सकता।" : "Task title cannot exceed 200 characters.";
    } else if (!/[A-Za-z0-9\u0900-\u097F]/.test(trimmedTitle)) {
      errors.title =
        language === "hi" ? "कार्य शीर्षक में अक्षर या अंक होने चाहिए।" : "Task title must contain alphanumeric characters.";
    }

    if (!trimmedDescription) {
      errors.description =
        language === "hi" ? "कार्य विवरण आवश्यक है।" : "Task description is required.";
    } else if (trimmedDescription.length < 10) {
      errors.description =
        language === "hi" ? "कार्य विवरण कम से कम 10 वर्णों का होना चाहिए।" : "Task description must be at least 10 characters.";
    } else if (trimmedDescription.length > 5000) {
      errors.description =
        language === "hi" ? "कार्य विवरण 5000 वर्णों से अधिक नहीं हो सकता।" : "Task description cannot exceed 5000 characters.";
    } else if (!/[A-Za-z0-9\u0900-\u097F]/.test(trimmedDescription)) {
      errors.description =
        language === "hi" ? "कार्य विवरण में अक्षर या अंक होने चाहिए।" : "Task description must contain alphanumeric characters.";
    }

    if (assignedTo.length === 0) {
      errors.assignedTo =
        language === "hi" ? "कृपया कम से कम एक कर्मचारी चुनें।" : "Please select at least one employee.";
    }

    const today = getTodayDate();
    if (!dueDate) {
      errors.dueDate = language === "hi" ? "कृपया एक नियत तिथि चुनें।" : "Please select a due date.";
    } else if (dueDate <= today) {
      errors.dueDate =
        language === "hi" ? "नियत तिथि भविष्य में होनी चाहिए।" : "Due date must be in the future.";
    }

    setFieldErrors(errors);

    const firstError =
      errors.title || errors.description || errors.assignedTo || errors.dueDate;
    if (firstError) {
      setError(firstError);
      showToast.warning(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) return;

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    try {
      setSubmitting(true);

      const res = await apiRequest("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          assignedTo,
          priority,
          dueDate,
        }),
      });

      const successMsg =
        res?.message ||
        (language === "hi" ? "कार्य सफलतापूर्वक बनाया गया।" : "Task created successfully.");
      setSuccess(successMsg);
      showToast.success(successMsg);

      setTimeout(() => {
        router.push("/admin/tasks");
        router.refresh();
      }, 700);
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : (language === "hi" ? "कार्य बनाने में विफल।" : "Failed to create task.");
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ===================================================
  // RENDER PREVIEW ASSIGNEES
  // ===================================================

  const renderPreviewAssignees = () => {
    if (selectedEmployees.length === 0) {
      return (
        <span className="text-xs font-semibold text-[#8497A1] dark:text-[#9FB6C0]">
          {language === "hi" ? "असाइन नहीं किया गया" : "Not assigned"}
        </span>
      );
    }

    if (selectedEmployees.length <= 2) {
      return (
        <div className="flex flex-col gap-1.5">
          {selectedEmployees.map((emp) => (
            <div key={getEmployeeId(emp)} className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF6F9] text-[9px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                {getEmployeeInitials(emp)}
              </span>
              <span className="truncate text-xs font-semibold text-[#063D63] dark:text-[#E5F1F5]">
                {getEmployeeName(emp)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    const extra = selectedEmployees.length - 2;
    return (
      <div className="flex flex-col gap-1.5">
        {selectedEmployees.slice(0, 2).map((emp) => (
          <div key={getEmployeeId(emp)} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF6F9] text-[9px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
              {getEmployeeInitials(emp)}
            </span>
            <span className="truncate text-xs font-semibold text-[#063D63] dark:text-[#E5F1F5]">
              {getEmployeeName(emp)}
            </span>
          </div>
        ))}
        <span className="inline-flex w-fit items-center rounded-full bg-[#EAF6F9] px-2 py-0.5 text-[10px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
          {language === "hi" ? `+${extra} और असाइन किए गए` : `+${extra} more assigned`}
        </span>
      </div>
    );
  };

  const isTitleNearLimit = title.length >= 130;
  const isDescriptionNearLimit = description.length >= 4800;

  // ===================================================
  // MAIN RENDER
  // ===================================================

  return (
    <main className="relative min-h-[calc(100vh-74px)] bg-[#F5F9FC] text-[#063B61] dark:bg-[#081C27] dark:text-[#E5F1F5]">
      {/* BACKGROUND GRID PATTERN */}
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
            TOP BAR NAVIGATION & HEADER
        ================================================= */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => router.push("/admin/tasks")}
              disabled={submitting}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D8E4EC] bg-white text-[#607985] shadow-sm transition hover:bg-[#F5F9FA] hover:text-[#087D8F] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3D6375] dark:bg-[#102A38] dark:text-[#AFC5CE] dark:hover:bg-[#18333F] dark:hover:text-[#4CD2DA]"
              title={language === "hi" ? "कार्यों पर वापस जाएं" : "Back to Tasks"}
              aria-label={language === "hi" ? "कार्यों पर वापस जाएं" : "Back to Tasks"}
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#087D8F] dark:text-[#4CD2DA]">
                {t("tasks.taskOperations") || (language === "hi" ? "कार्य संचालन" : "TASK OPERATIONS")}
              </p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#063D63] sm:text-[28px] dark:text-[#E5F1F5]">
                {t("tasks.createTask") || (language === "hi" ? "कार्य बनाएं" : "Create Task")}
              </h1>
              <p className="mt-0.5 text-xs font-medium text-[#6B879B] sm:text-[13px] dark:text-[#9FB6C0]">
                {language === "hi"
                  ? "कर्मचारी के लिए एक नया कार्य बनाएं और असाइन करें।"
                  : "Create and assign a task to an employee."}
              </p>
            </div>
          </div>

          {/* TASK STATUS BADGE */}
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-[#D8E4EC] bg-white px-3 py-1.5 shadow-sm dark:border-[#3D6375] dark:bg-[#102A38]">
            <span className="h-2 w-2 rounded-full bg-[#00A6C7]" />
            <span className="text-xs font-semibold text-[#607985] dark:text-[#AFC5CE]">
              {language === "hi" ? "प्रारूप कार्य" : "Draft Task"}
            </span>
          </div>
        </div>

        {/* =================================================
            MAIN LAYOUT: 70% FORM | 30% STICKY SIDEBAR
        ================================================= */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* =================================================
                LEFT: COHESIVE UNIFIED FORM WORKSPACE CARD
            ================================================= */}
            <div className="rounded-[14px] border border-[#D8E4EC] bg-white shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
              {/* -----------------------------------------------
                  SECTION 1: TASK DETAILS
              ------------------------------------------------ */}
              <div className="border-b border-[#E8EFF3] p-5 sm:p-6 dark:border-[#2B4B5B]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                    <ClipboardPen size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                      {language === "hi" ? "कार्य विवरण" : "TASK DETAILS"}
                    </span>
                    <h2 className="text-[15px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                      {t("tasks.taskInformation") || (language === "hi" ? "कार्य जानकारी" : "Task information")}
                    </h2>
                    <p className="text-xs font-medium text-[#6B879B] dark:text-[#8FA8B2]">
                      {language === "hi"
                        ? "परिभाषित करें कि क्या पूरा किया जाना है और इसे कौन संभालेगा।"
                        : "Define what needs to be completed and who should handle it."}
                    </p>
                  </div>
                </div>

                {/* FIELDS FOR TASK DETAILS */}
                <div className="mt-5 space-y-4 sm:space-y-5">
                  {/* TASK TITLE */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="taskTitle"
                        className="text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5]"
                      >
                        {t("tasks.taskTitle") || (language === "hi" ? "कार्य शीर्षक" : "Task title")}
                        <span className="ml-1 text-[#E5484D]">*</span>
                      </label>

                      <span
                        className={`text-[11px] font-medium transition-colors ${
                          isTitleNearLimit
                            ? "font-bold text-[#F2A51A]"
                            : "text-[#8497A1] dark:text-[#8FA8B2]"
                        }`}
                      >
                        {title.length} / 150
                      </span>
                    </div>

                    <input
                      id="taskTitle"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (fieldErrors.title) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            title: undefined,
                          }));
                        }
                      }}
                      placeholder={
                        language === "hi"
                          ? "उदा. मासिक बिक्री रिपोर्ट पूर्ण करें"
                          : "e.g. Complete monthly sales report"
                      }
                      maxLength={150}
                      disabled={submitting}
                      autoComplete="off"
                      className={`mt-1.5 h-11 w-full rounded-[10px] border bg-white px-3.5 text-xs sm:text-[13px] font-medium text-[#063D63] outline-none transition placeholder:text-[#A0B0BA] focus:border-[#00A6C7] focus:ring-2 focus:ring-[#00A6C7]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0D2430] dark:text-[#E5F1F5] dark:placeholder:text-[#8FA8B2] ${
                        fieldErrors.title
                          ? "border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15 dark:border-[#E5484D]"
                          : "border-[#C9D9E4] dark:border-[#3D6375]"
                      }`}
                    />

                    {fieldErrors.title && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]">
                        <AlertCircle size={13} className="shrink-0" />
                        {fieldErrors.title}
                      </p>
                    )}
                  </div>

                  {/* DESCRIPTION */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="taskDescription"
                        className="text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5]"
                      >
                        {t("tasks.taskDescription") || (language === "hi" ? "विवरण" : "Description")}
                        <span className="ml-1 text-[#E5484D]">*</span>
                      </label>

                      <span
                        className={`text-[11px] font-medium transition-colors ${
                          isDescriptionNearLimit
                            ? "font-bold text-[#F2A51A]"
                            : "text-[#8497A1] dark:text-[#8FA8B2]"
                        }`}
                      >
                        {description.length} / 5000
                      </span>
                    </div>

                    <textarea
                      id="taskDescription"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        if (fieldErrors.description) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            description: undefined,
                          }));
                        }
                      }}
                      placeholder={
                        language === "hi"
                          ? "वर्णन करें कि क्या पूरा किया जाना है, अपेक्षित परिणाम, आवश्यकताएं..."
                          : "Describe what needs to be completed, expected outcome, requirements..."
                      }
                      rows={5}
                      maxLength={5000}
                      disabled={submitting}
                      className={`mt-1.5 min-h-[135px] w-full resize-y rounded-[10px] border bg-white px-3.5 py-2.5 text-xs sm:text-[13px] font-medium leading-relaxed text-[#063D63] outline-none transition placeholder:text-[#A0B0BA] focus:border-[#00A6C7] focus:ring-2 focus:ring-[#00A6C7]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0D2430] dark:text-[#E5F1F5] dark:placeholder:text-[#8FA8B2] ${
                        fieldErrors.description
                          ? "border-[#E5484D] focus:border-[#E5484D] focus:ring-[#E5484D]/15 dark:border-[#E5484D]"
                          : "border-[#C9D9E4] dark:border-[#3D6375]"
                      }`}
                    />

                    {fieldErrors.description && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]">
                        <AlertCircle size={13} className="shrink-0" />
                        {fieldErrors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* -----------------------------------------------
                  SECTION 2: ASSIGNMENT & PLANNING
              ------------------------------------------------ */}
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                      {language === "hi" ? "असाइनमेंट और योजना" : "ASSIGNMENT & PLANNING"}
                    </span>
                    <h2 className="text-[15px] font-bold text-[#063D63] dark:text-[#E5F1F5]">
                      {language === "hi" ? "असाइनमेंट और योजना" : "Assignment & Planning"}
                    </h2>
                    <p className="text-xs font-medium text-[#6B879B] dark:text-[#8FA8B2]">
                      {language === "hi"
                        ? "कर्मचारी असाइन करें, कार्य प्राथमिकता निर्धारित करें और समय सीमा तय करें।"
                        : "Assign employees, set task priority, and establish target deadlines."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-5">
                  {/* ASSIGN EMPLOYEE (FULL WIDTH COMBOBOX) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5]">
                        {t("tasks.assignEmployee") || (language === "hi" ? "कर्मचारी असाइन करें" : "Assign employee")}
                        <span className="ml-1 text-[#E5484D]">*</span>
                      </label>

                      {assignedTo.length > 1 && (
                        <button
                          type="button"
                          onClick={clearAllEmployees}
                          disabled={submitting}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#E5484D] transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X size={12} />
                          {language === "hi" ? `सभी हटाएं (${assignedTo.length})` : `Clear all (${assignedTo.length})`}
                        </button>
                      )}
                    </div>

                    {/* SELECTED CHIPS LIST */}
                    {assignedTo.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedEmployees.map((emp) => (
                          <span
                            key={getEmployeeId(emp)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C4DDE5] bg-[#EAF6F9] px-2.5 py-1 text-xs font-semibold text-[#087D8F] dark:border-[#2A5A6A] dark:bg-[#123C46] dark:text-[#4CD2DA]"
                          >
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#087D8F] text-[9px] font-bold text-white dark:bg-[#4CD2DA] dark:text-[#081C27]">
                              {getEmployeeInitials(emp)}
                            </span>
                            <span className="truncate max-w-[140px]">
                              {getEmployeeName(emp)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEmployee(getEmployeeId(emp))}
                              disabled={submitting}
                              className="ml-0.5 text-[#087D8F] transition hover:text-[#E5484D] disabled:cursor-not-allowed dark:text-[#4CD2DA] dark:hover:text-[#E5484D]"
                              aria-label={`Remove ${getEmployeeName(emp)}`}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* CUSTOM DROPDOWN SELECTOR */}
                    <div ref={dropdownRef} className="relative mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!employeesLoading && !submitting) {
                            setIsDropdownOpen((prev) => !prev);
                            if (!isDropdownOpen) setEmployeeSearch("");
                          }
                        }}
                        disabled={employeesLoading || submitting}
                        className={`flex h-11 w-full items-center justify-between rounded-[10px] border bg-white px-3.5 text-xs sm:text-[13px] font-medium text-[#063D63] outline-none transition focus:border-[#00A6C7] focus:ring-2 focus:ring-[#00A6C7]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0D2430] dark:text-[#E5F1F5] ${
                          fieldErrors.assignedTo
                            ? "border-[#E5484D] focus:border-[#E5484D] dark:border-[#E5484D]"
                            : "border-[#C9D9E4] dark:border-[#3D6375]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserRound
                            size={15}
                            className="shrink-0 text-[#6B879B] dark:text-[#8FA8B2]"
                          />
                          <span className="truncate text-left">
                            {employeesLoading ? (
                              <span className="text-[#A0B0BA] dark:text-[#8FA8B2]">
                                {language === "hi" ? "कर्मचारी लोड हो रहे हैं..." : "Loading employees..."}
                              </span>
                            ) : employees.length === 0 ? (
                              <span className="text-[#A0B0BA] dark:text-[#8FA8B2]">
                                {language === "hi" ? "कोई कर्मचारी उपलब्ध नहीं" : "No employees available"}
                              </span>
                            ) : assignedTo.length === 0 ? (
                              <span className="text-[#A0B0BA] dark:text-[#8FA8B2]">
                                {language === "hi" ? "कर्मचारी चुनें..." : "Select employee..."}
                              </span>
                            ) : (
                              <span className="text-[#063D63] dark:text-[#E5F1F5]">
                                {assignedTo.length === 1
                                  ? (language === "hi"
                                      ? `1 कर्मचारी चयनित (${getEmployeeName(selectedEmployees[0])})`
                                      : `1 employee selected (${getEmployeeName(selectedEmployees[0])})`)
                                  : (language === "hi"
                                      ? `${assignedTo.length} कर्मचारी चयनित`
                                      : `${assignedTo.length} employees selected`)}
                              </span>
                            )}
                          </span>
                        </div>

                        <ChevronDown
                          size={15}
                          className={`shrink-0 text-[#6B879B] transition-transform duration-200 dark:text-[#8FA8B2] ${
                            isDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* DROPDOWN MENU */}
                      {isDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-[#D8E4EC] bg-white shadow-xl dark:border-[#3D6375] dark:bg-[#102A38]">
                          {/* SEARCH INPUT */}
                          <div className="border-b border-[#E8EFF3] p-2.5 dark:border-[#2B4B5B]">
                            <div className="flex items-center gap-2 rounded-lg border border-[#D8E4EC] bg-[#F5F9FA] px-2.5 py-1.5 focus-within:border-[#00A6C7] focus-within:ring-2 focus-within:ring-[#00A6C7]/15 dark:border-[#3D6375] dark:bg-[#0D2430]">
                              <Search
                                size={13}
                                className="shrink-0 text-[#6B879B] dark:text-[#8FA8B2]"
                              />
                              <input
                                ref={searchInputRef}
                                type="text"
                                value={employeeSearch}
                                onChange={(e) =>
                                  setEmployeeSearch(e.target.value)
                                }
                                placeholder={
                                  language === "hi"
                                    ? "नाम, विभाग या आईडी द्वारा कर्मचारी खोजें..."
                                    : "Search employees by name, department, or ID..."
                                }
                                className="flex-1 bg-transparent text-xs text-[#063D63] outline-none placeholder:text-[#A0B0BA] dark:text-[#E5F1F5] dark:placeholder:text-[#8FA8B2]"
                              />
                              {employeeSearch && (
                                <button
                                  type="button"
                                  onClick={() => setEmployeeSearch("")}
                                  className="text-[#8497A1] transition hover:text-[#E5484D] dark:text-[#8FA8B2]"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* EMPLOYEE LIST */}
                          <div className="max-h-[240px] overflow-y-auto divide-y divide-[#F0F5F8] dark:divide-[#1C3A4B]">
                            {filteredEmployees.length === 0 ? (
                              <div className="flex flex-col items-center gap-1.5 py-6 text-center">
                                <UserRound
                                  size={20}
                                  className="text-[#A0B0BA] dark:text-[#8FA8B2]"
                                />
                                <p className="text-xs font-semibold text-[#6B879B] dark:text-[#9FB6C0]">
                                  {language === "hi" ? "कोई कर्मचारी नहीं मिला" : "No employees found"}
                                </p>
                                <p className="text-[11px] text-[#A0B0BA] dark:text-[#8FA8B2]">
                                  {language === "hi" ? "अपनी खोज बदलने का प्रयास करें" : "Try adjusting your search query"}
                                </p>
                              </div>
                            ) : (
                              filteredEmployees.map((emp) => {
                                const empId = getEmployeeId(emp);
                                const isSelected = assignedTo.includes(empId);

                                return (
                                  <button
                                    key={empId}
                                    type="button"
                                    onClick={() => toggleEmployee(empId)}
                                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-[#F5F9FC] dark:hover:bg-[#18333F] ${
                                      isSelected
                                        ? "bg-[#EAF6F9]/60 dark:bg-[#123C46]/50"
                                        : ""
                                    }`}
                                  >
                                    {/* CHECKBOX */}
                                    <span
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                                        isSelected
                                          ? "border-[#087D8F] bg-[#087D8F] text-white dark:border-[#4CD2DA] dark:bg-[#4CD2DA] dark:text-[#081C27]"
                                          : "border-[#C9D9E4] bg-white dark:border-[#3D6375] dark:bg-[#0D2430]"
                                      }`}
                                    >
                                      {isSelected && (
                                        <svg
                                          viewBox="0 0 10 8"
                                          fill="none"
                                          className="h-2.5 w-2.5"
                                        >
                                          <path
                                            d="M1 4l2.5 2.5L9 1"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </span>

                                    {/* AVATAR */}
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF6F9] text-[10px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                                      {getEmployeeInitials(emp)}
                                    </span>

                                    {/* EMPLOYEE INFO */}
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-bold text-[#063D63] dark:text-[#E5F1F5]">
                                        {getEmployeeName(emp)}
                                      </p>
                                      <p className="truncate text-[11px] text-[#6B879B] dark:text-[#8FA8B2]">
                                        {[
                                          emp.designation,
                                          emp.department,
                                          emp.employeeId,
                                        ]
                                          .filter(Boolean)
                                          .join(" • ")}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {/* FOOTER */}
                          {assignedTo.length > 0 && (
                            <div className="flex items-center justify-between border-t border-[#E8EFF3] bg-[#FBFDFE] px-3.5 py-2 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                              <span className="text-[11px] font-semibold text-[#6B879B] dark:text-[#8FA8B2]">
                                {language === "hi"
                                  ? `${assignedTo.length} कर्मचारी चयनित`
                                  : `${assignedTo.length} employee${assignedTo.length > 1 ? "s" : ""} selected`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsDropdownOpen(false);
                                  setEmployeeSearch("");
                                }}
                                className="text-xs font-bold text-[#087D8F] hover:underline dark:text-[#4CD2DA]"
                              >
                                {language === "hi" ? "संपन्न" : "Done"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {fieldErrors.assignedTo && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]">
                        <AlertCircle size={13} className="shrink-0" />
                        {fieldErrors.assignedTo}
                      </p>
                    )}
                  </div>

                  {/* 2-COLUMN GRID: PRIORITY & DUE DATE */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* PRIORITY SELECTOR */}
                    <div>
                      <label className="text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5]">
                        {t("tasks.priority") || (language === "hi" ? "प्राथमिकता" : "Priority")}
                      </label>

                      {/* 4-OPTION SEGMENTED SELECTOR */}
                      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                        {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map(
                          (p) => {
                            const config = PRIORITY_CONFIG[p];
                            const isSelected = priority === p;

                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                disabled={submitting}
                                className={`flex h-11 flex-col items-center justify-center rounded-[9px] border px-1 text-center transition-all ${
                                  isSelected
                                    ? `${config.pillActiveBg} ${config.pillActiveBorder} font-bold shadow-sm`
                                    : "border-[#D8E4EC] bg-white text-[#607985] hover:bg-[#F5F9FA] hover:text-[#063D63] dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#AFC5CE] dark:hover:bg-[#18333F]"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <span className="flex items-center gap-1">
                                  <Flag
                                    size={11}
                                    className={
                                      isSelected
                                        ? config.flagColor
                                        : "text-[#8497A1] dark:text-[#8FA8B2]"
                                    }
                                  />
                                  <span className="text-[11px] tracking-tight">
                                    {t(`priority.${p.toLowerCase()}`) || config.label}
                                  </span>
                                </span>
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* DUE DATE PICKER */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="dueDateInput"
                          className="text-xs font-semibold text-[#063B61] dark:text-[#E5F1F5]"
                        >
                          {t("tasks.dueDate") || (language === "hi" ? "नियत तिथि" : "Due date")}
                          <span className="ml-1 text-[#E5484D]">*</span>
                        </label>
                      </div>

                      <div
                        className="relative mt-1.5 cursor-pointer"
                        onClick={(e) => {
                          if (
                            !submitting &&
                            e.target !== dueDateInputRef.current
                          ) {
                            dueDateInputRef.current?.focus();
                            try {
                              dueDateInputRef.current?.showPicker();
                            } catch {}
                          }
                        }}
                      >
                        <CalendarDays
                          size={15}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B879B] dark:text-[#8FA8B2]"
                        />

                        <input
                          ref={dueDateInputRef}
                          id="dueDateInput"
                          type="date"
                          value={dueDate}
                          min={getTodayDate()}
                          onChange={(e) => {
                            setDueDate(e.target.value);
                            if (fieldErrors.dueDate) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                dueDate: undefined,
                              }));
                            }
                          }}
                          onClick={(e) => {
                            if (!submitting) {
                              try {
                                e.currentTarget.showPicker();
                              } catch {}
                            }
                          }}
                          disabled={submitting}
                          className={`h-11 w-full cursor-pointer rounded-[10px] border bg-white pl-10 pr-3.5 text-xs sm:text-[13px] font-medium text-[#063D63] outline-none transition focus:border-[#00A6C7] focus:ring-2 focus:ring-[#00A6C7]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0D2430] dark:text-[#E5F1F5] [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
                            fieldErrors.dueDate
                              ? "border-[#E5484D] focus:border-[#E5484D] dark:border-[#E5484D]"
                              : "border-[#C9D9E4] dark:border-[#3D6375]"
                          }`}
                        />
                      </div>

                      {fieldErrors.dueDate && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#E5484D]">
                          <AlertCircle size={13} className="shrink-0" />
                          {fieldErrors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* -----------------------------------------------
                  GLOBAL NOTIFICATION BANNERS (IF APPLICABLE)
              ------------------------------------------------ */}
              {error && (
                <div className="mx-5 mb-5 sm:mx-6 flex items-start gap-2.5 rounded-xl border border-[#F2D8D8] bg-[#FFF7F7] p-3.5 dark:border-[#5A3438] dark:bg-[#341F23]">
                  <Info
                    size={16}
                    className="mt-0.5 shrink-0 text-[#E5484D]"
                  />
                  <p className="text-xs font-semibold leading-relaxed text-[#B04A4A] dark:text-[#FFA3A3]">
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div className="mx-5 mb-5 sm:mx-6 flex items-start gap-2.5 rounded-xl border border-[#CDECE3] bg-[#F2FBF8] p-3.5 dark:border-[#365F52] dark:bg-[#123C35]">
                  <CheckCircle2
                    size={16}
                    className="mt-0.5 shrink-0 text-[#00A878]"
                  />
                  <p className="text-xs font-semibold leading-relaxed text-[#00A878]">
                    {success}
                  </p>
                </div>
              )}

              {/* -----------------------------------------------
                  BOTTOM ACTION BAR
              ------------------------------------------------ */}
              <div className="flex flex-col-reverse items-center justify-end gap-3 border-t border-[#E8EFF3] bg-[#FBFDFE] p-4 sm:flex-row sm:px-6 dark:border-[#2B4B5B] dark:bg-[#0D2430]/70">
                <button
                  type="button"
                  onClick={() => router.push("/admin/tasks")}
                  disabled={submitting}
                  className="h-10 w-full sm:w-auto rounded-[10px] border border-[#D8E4EC] bg-white px-5 text-xs sm:text-[13px] font-bold text-[#607985] shadow-sm transition hover:bg-[#F5F9FA] hover:text-[#063D63] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3D6375] dark:bg-[#102A38] dark:text-[#AFC5CE] dark:hover:bg-[#18333F]"
                >
                  {t("common.cancel") || (language === "hi" ? "रद्द करें" : "Cancel")}
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting || employeesLoading || employees.length === 0
                  }
                  className="flex h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-[10px] bg-[#063D63] px-6 text-xs sm:text-[13px] font-bold text-white shadow-sm transition hover:bg-[#052F4D] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0B2A3A] dark:hover:bg-[#12455C]"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{language === "hi" ? "कार्य बनाया जा रहा है..." : "Creating Task..."}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} />
                      <span>{t("tasks.createTask") || (language === "hi" ? "कार्य बनाएं" : "Create Task")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
                RIGHT: LIVE PREVIEW & GUIDELINES SIDEBAR
            ================================================= */}
            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              {/* LIVE TASK CARD PREVIEW */}
              <div className="rounded-[14px] border border-[#D8E4EC] bg-white p-5 shadow-[0_2px_12px_rgba(6,61,99,0.035)] dark:border-[#3A5F71] dark:bg-[#102A38]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#087D8F] dark:text-[#4CD2DA]">
                      {language === "hi" ? "लाइव पूर्वावलोकन" : "LIVE PREVIEW"}
                    </span>
                    <h2 className="text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                      {language === "hi" ? "कार्य पूर्वावलोकन" : "Task preview"}
                    </h2>
                  </div>

                  <span className="rounded-md border border-[#D8E4EC] bg-[#F5F9FA] px-2 py-0.5 text-[10px] font-bold text-[#607985] dark:border-[#3D6375] dark:bg-[#0D2430] dark:text-[#AFC5CE]">
                    {language === "hi" ? "नया" : "NEW"}
                  </span>
                </div>

                {/* COMPACT REALISTIC PREVIEW CARD */}
                <div className="mt-4 rounded-xl border border-[#E8EFF3] bg-[#FBFDFE] p-4 dark:border-[#2B4B5B] dark:bg-[#0D2430]">
                  {/* CARD HEADER: ICON & PRIORITY */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF6F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                      <FileText size={15} />
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                        PRIORITY_CONFIG[priority].badgeBg
                      } ${PRIORITY_CONFIG[priority].badgeText} ${
                        PRIORITY_CONFIG[priority].badgeBorder
                      }`}
                    >
                      <Flag
                        size={10}
                        className={PRIORITY_CONFIG[priority].flagColor}
                      />
                      {t(`priority.${priority.toLowerCase()}`) || priority}
                    </span>
                  </div>

                  {/* TITLE */}
                  <h3 className="mt-3 break-words text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {title.trim() || (
                      <span className="text-[#9AAAB2] dark:text-[#8FA8B2]">
                        {language === "hi" ? "आपका कार्य शीर्षक" : "Your task title"}
                      </span>
                    )}
                  </h3>

                  {/* DESCRIPTION */}
                  <p className="mt-1.5 line-clamp-4 break-words text-xs leading-relaxed text-[#6B879B] dark:text-[#9FB6C0]">
                    {description.trim() || (
                      <span className="italic text-[#A0B0BA] dark:text-[#8FA8B2]">
                        {language === "hi"
                          ? "जब आप विवरण दर्ज करेंगे तो वह यहां दिखाई देगा।"
                          : "Task description will appear here once you enter it."}
                      </span>
                    )}
                  </p>

                  {/* METADATA STRIP */}
                  <div className="mt-4 space-y-3 border-t border-[#E8EFF3] pt-3 dark:border-[#2B4B5B]">
                    {/* ASSIGNEES */}
                    <div className="flex items-start gap-2.5">
                      <UserRound
                        size={14}
                        className="mt-0.5 shrink-0 text-[#087D8F] dark:text-[#4CD2DA]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                          {t("tasks.assignedTo") || (language === "hi" ? "असाइन किया गया" : "Assigned to")}
                        </p>
                        <div className="mt-1">{renderPreviewAssignees()}</div>
                      </div>
                    </div>

                    {/* DUE DATE */}
                    <div className="flex items-center gap-2.5">
                      <CalendarDays
                        size={14}
                        className="shrink-0 text-[#087D8F] dark:text-[#4CD2DA]"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8497A1] dark:text-[#8FA8B2]">
                          {t("tasks.dueDate") || (language === "hi" ? "नियत तिथि" : "Due date")}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-[#063D63] dark:text-[#E5F1F5]">
                          {formatPreviewDate(dueDate, language)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CREATION GUIDELINES CARD */}
              <div className="rounded-[14px] border border-[#CFE5EA] bg-[#F5FBFC] p-4 sm:p-5 dark:border-[#365C68] dark:bg-[#102E38]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#DFF2F5] text-[#087D8F] dark:bg-[#164854] dark:text-[#4CD2DA]">
                    <CheckCircle2 size={15} />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#063D63] dark:text-[#E5F1F5]">
                    {language === "hi" ? "निर्माण दिशानिर्देश" : "CREATION GUIDELINES"}
                  </h3>
                </div>

                <ul className="mt-3.5 space-y-2.5">
                  <li className="flex items-start gap-2 text-xs text-[#536B77] dark:text-[#AFC5CE]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087D8F] dark:bg-[#4CD2DA]" />
                    <span className="leading-snug">
                      {language === "hi"
                        ? "स्पष्ट और कार्रवाई योग्य कार्य शीर्षक का उपयोग करें।"
                        : "Use clear and actionable task titles."}
                    </span>
                  </li>

                  <li className="flex items-start gap-2 text-xs text-[#536B77] dark:text-[#AFC5CE]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087D8F] dark:bg-[#4CD2DA]" />
                    <span className="leading-snug">
                      {language === "hi"
                        ? "विवरण में पर्याप्त संदर्भ शामिल करें।"
                        : "Include enough context in the description."}
                    </span>
                  </li>

                  <li className="flex items-start gap-2 text-xs text-[#536B77] dark:text-[#AFC5CE]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087D8F] dark:bg-[#4CD2DA]" />
                    <span className="leading-snug">
                      {language === "hi"
                        ? "कार्य को सही कर्मचारी को असाइन करें।"
                        : "Assign the task to the correct employee."}
                    </span>
                  </li>

                  <li className="flex items-start gap-2 text-xs text-[#536B77] dark:text-[#AFC5CE]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#087D8F] dark:bg-[#4CD2DA]" />
                    <span className="leading-snug">
                      {language === "hi"
                        ? "एक यथार्थवादी समय सीमा और प्राथमिकता निर्धारित करें।"
                        : "Set a realistic deadline and priority."}
                    </span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}
