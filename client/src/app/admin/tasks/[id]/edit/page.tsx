"use client"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Flag,
  Loader2,
  Lock,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

// =====================================================
// TYPES
// =====================================================

type Priority = "LOW" | "MEDIUM" | "HIGH";

type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  profilePhoto?: string;
  employeeId?: string;
  role?: string;
  department?: string;
  designation?: string;
}

interface PopulatedEmployee {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Task {
  _id: string;
  title: string;
  description?: string;

  assignedTo?:
    | string
    | PopulatedEmployee
    | null;

  priority?: string;

  status?: string;

  dueDate?: string;

  createdAt?: string;
  updatedAt?: string;
}

interface TaskResponse {
  success?: boolean;
  message?: string;

  data?: {
    task?: Task;
  };
}

interface EmployeeResponse {
  success?: boolean;
  message?: string;

  data?: {
    employees?: Employee[];
  };
}

interface UpdateTaskResponse {
  success?: boolean;
  message?: string;

  data?: {
    task?: Task;
  };
}

// =====================================================
// CONSTANTS
// =====================================================

const MAX_TITLE_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 2000;

// =====================================================
// NORMALIZE PRIORITY
//
// BACKEND VALUES:
// LOW
// MEDIUM
// HIGH
// =====================================================

const normalizePriority = (
  value?: string
): Priority => {
  if (!value) {
    return "MEDIUM";
  }

  const normalized = value
    .trim()
    .toUpperCase();

  switch (normalized) {
    case "LOW":
      return "LOW";

    case "MEDIUM":
      return "MEDIUM";

    case "HIGH":
      return "HIGH";

    default:
      return "MEDIUM";
  }
};

// =====================================================
// NORMALIZE STATUS
//
// BACKEND VALUES:
// PENDING
// IN_PROGRESS
// COMPLETED
// =====================================================

const normalizeStatus = (
  value?: string
): TaskStatus => {
  if (!value) {
    return "PENDING";
  }

  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "PENDING":
      return "PENDING";

    case "IN_PROGRESS":
      return "IN_PROGRESS";

    case "COMPLETED":
      return "COMPLETED";

    default:
      return "PENDING";
  }
};

// =====================================================
// DATE FOR INPUT
// =====================================================

const formatDateForInput = (
  value?: string
): string => {
  if (!value) {
    return "";
  }

  try {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

// =====================================================
// EXTRACT ASSIGNED EMPLOYEE ID
// =====================================================

const extractAssignedEmployeeId = (
  assignedTo:
    | string
    | PopulatedEmployee
    | null
    | undefined
): string => {
  if (!assignedTo) {
    return "";
  }

  if (typeof assignedTo === "string") {
    return assignedTo;
  }

  if (
    typeof assignedTo === "object" &&
    assignedTo._id
  ) {
    return String(assignedTo._id);
  }

  return "";
};

// =====================================================
// EMPLOYEE NAME
// =====================================================

const getEmployeeName = (
  employee: Employee
): string => {
  return `${employee.firstName || ""} ${
    employee.lastName || ""
  }`.trim() || employee.email || "Employee";
};

const getEmployeeInitials = (
  employee: Employee
): string => {
  const first = (employee.firstName || "").charAt(0);
  const last = (employee.lastName || "").charAt(0);
  return (
    (first + last).toUpperCase() ||
    employee.email?.charAt(0).toUpperCase() ||
    "?"
  );
};

// =====================================================
// PAGE
// =====================================================

export default function EditTaskPage() {
  const { t, language } = useLanguage();


  const router = useRouter();

  const params = useParams();

  // ===================================================
  // TASK ID
  // ===================================================

  const taskId = useMemo(() => {
    const value = params?.id;

    if (Array.isArray(value)) {
      return value[0] || "";
    }

    if (typeof value === "string") {
      return value.trim();
    }

    return "";
  }, [params]);

  // ===================================================
  // PAGE STATES
  // ===================================================

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  // ===================================================
  // EMPLOYEES
  // ===================================================

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  // ===================================================
  // FORM
  // ===================================================

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [assignedTo, setAssignedTo] =
    useState("");

  // ===================================================
  // CUSTOM EMPLOYEE DROPDOWN STATE
  // ===================================================

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((emp) => {
      const fullName = `${emp.firstName || ""} ${emp.lastName || ""}`.toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const department = (emp.department || "").toLowerCase();
      const empId = (emp.employeeId || "").toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        department.includes(q) ||
        empId.includes(q)
      );
    });
  }, [employees, employeeSearch]);

  // Click outside and Escape key handlers
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDropdownOpen) {
        setIsDropdownOpen(false);
        setEmployeeSearch("");
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Focus search input and initialize focused index when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      const selectedIdx = filteredEmployees.findIndex(
        (emp) => String(emp._id) === String(assignedTo)
      );
      setFocusedIndex(selectedIdx >= 0 ? selectedIdx : 0);
      if (searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setFocusedIndex(-1);
    }
  }, [isDropdownOpen]);

  // Scroll focused option into view during keyboard navigation
  useEffect(() => {
    if (isDropdownOpen && focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [focusedIndex, isDropdownOpen]);

  // IMPORTANT:
  // Backend expects uppercase
  const [priority, setPriority] =
    useState<Priority>("MEDIUM");

  // Admin Task Edit: Task Status must ALWAYS be "PENDING"
  const status: TaskStatus = "PENDING";

  const [dueDate, setDueDate] =
    useState("");

  // ===================================================
  // FETCH TASK
  // ===================================================

  const fetchTask =
    async (): Promise<Task> => {
      if (!taskId) {
        throw new Error(
          "Task ID is missing."
        );
      }

      console.log(
        "[EDIT TASK] Fetching task:",
        taskId
      );

      const response =
        await apiRequest<TaskResponse>(
          `/api/tasks/${encodeURIComponent(
            taskId
          )}`,
          {
            method: "GET",
          }
        );

      console.log(
        "[EDIT TASK] Task response:",
        response
      );

      const task =
        response?.data?.task;

      if (!task) {
        throw new Error(
          response?.message ||
            "Task not found."
        );
      }

      return task;
    };

  // ===================================================
  // FETCH EMPLOYEES
  // ===================================================

  const fetchEmployees =
    async (): Promise<Employee[]> => {
      console.log(
        "[EDIT TASK] Fetching employees..."
      );

      const response =
        await apiRequest<EmployeeResponse>(
          "/api/users/employees",
          {
            method: "GET",
          }
        );

      console.log(
        "[EDIT TASK] Employee response:",
        response
      );

      const employeeList =
        response?.data?.employees;

      if (!Array.isArray(employeeList)) {
        return [];
      }

      return employeeList;
    };

  // ===================================================
  // LOAD TASK + EMPLOYEES
  // ===================================================

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      try {
        setLoading(true);
        setError("");

        if (!taskId) {
          throw new Error(
            "Task ID is missing."
          );
        }

        const [
          fetchedTask,
          fetchedEmployees,
        ] = await Promise.all([
          fetchTask(),
          fetchEmployees(),
        ]);

        if (!mounted) {
          return;
        }

        console.log(
          "[EDIT TASK] Loaded task:",
          fetchedTask
        );

        console.log(
          "[EDIT TASK] Loaded employees:",
          fetchedEmployees
        );

        // =================================================
        // TITLE
        // =================================================

        setTitle(
          fetchedTask.title || ""
        );

        // =================================================
        // DESCRIPTION
        // =================================================

        setDescription(
          fetchedTask.description || ""
        );

        // =================================================
        // PRIORITY
        // =================================================

        const normalizedPriority =
          normalizePriority(
            fetchedTask.priority
          );

        console.log(
          "[EDIT TASK] Priority:",
          fetchedTask.priority,
          "=>",
          normalizedPriority
        );

        setPriority(
          normalizedPriority
        );

        // Status is always PENDING for Admin task edit - not loaded from task
        console.log(
          "[EDIT TASK] Original task status:",
          fetchedTask.status,
          "=> Enforced: PENDING"
        );

        // =================================================
        // DUE DATE
        // =================================================

        setDueDate(
          formatDateForInput(
            fetchedTask.dueDate
          )
        );

        // =================================================
        // ASSIGNED EMPLOYEE
        // =================================================

        const employeeId =
          extractAssignedEmployeeId(
            fetchedTask.assignedTo
          );

        console.log(
          "[EDIT TASK] Assigned employee:",
          employeeId
        );

        setAssignedTo(employeeId);

        // =================================================
        // EMPLOYEES
        // =================================================

        setEmployees(
          fetchedEmployees
        );
      } catch (err: any) {
        console.error(
          "[EDIT TASK] Task load failed:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err?.message ||
            "Unable to load task."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      mounted = false;
    };
  }, [taskId]);

  // ===================================================
  // SELECTED EMPLOYEE
  // ===================================================

  const selectedEmployee =
    employees.find(
      (employee) =>
        String(employee._id) ===
        String(assignedTo)
    );

  // ===================================================
  // SUBMIT
  // ===================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    // =================================================
    // VALIDATION
    // =================================================

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    if (!cleanTitle) {
      const msg = t("taskTitleIsRequired") || (language === "hi" ? "कार्य शीर्षक आवश्यक है।" : "Task title is required.");
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (cleanTitle.length > MAX_TITLE_LENGTH) {
      const msg = language === "hi" ? `कार्य शीर्षक ${MAX_TITLE_LENGTH} वर्णों से अधिक नहीं हो सकता।` : `Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`;
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
      const msg = language === "hi" ? `विवरण ${MAX_DESCRIPTION_LENGTH} वर्णों से अधिक नहीं हो सकता।` : `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (!assignedTo) {
      const msg = t("pleaseSelectAnEmployee") || (language === "hi" ? "कृपया एक कर्मचारी चुनें।" : "Please select an employee.");
      setError(msg);
      showToast.warning(msg);
      return;
    }

    if (!dueDate) {
      const msg = t("dueDateIsRequired") || (language === "hi" ? "नियत तारीख आवश्यक है।" : "Due date is required.");
      setError(msg);
      showToast.warning(msg);
      return;
    }

    // =================================================
    // FORCE BACKEND VALUES
    // =================================================

    const finalPriority: Priority =
      normalizePriority(priority);

    // =================================================
    // PAYLOAD
    //
    // IMPORTANT:
    // Status is always "PENDING" on Admin Task Edit.
    // =================================================

    const payload = {
      title: cleanTitle,
      description: cleanDescription,
      assignedTo: assignedTo,
      priority: finalPriority,
      status: "PENDING",
      dueDate: dueDate,
    };

    // =================================================
    // UPDATE API
    // =================================================

    try {
      setSaving(true);

      const response =
        await apiRequest<UpdateTaskResponse>(
          `/api/tasks/${encodeURIComponent(
            taskId
          )}`,
          {
            method: "PATCH",
            body: JSON.stringify(
              payload
            ),
          }
        );

      const successMsg = language === "hi" ? "कार्य सफलतापूर्वक अपडेट किया गया।" : (response?.message || "Task updated successfully.");
      setSuccessMessage(successMsg);
      showToast.success(successMsg);

      // =================================================
      // REDIRECT
      // =================================================

      setTimeout(() => {
        router.push(
          "/admin/tasks"
        );

        router.refresh();
      }, 800);
    } catch (err: any) {
      console.error(
        "[EDIT TASK] Update failed:",
        err
      );

      const errorMsg = language === "hi" ? "कार्य अपडेट करने में असमर्थ।" : (err?.message || "Unable to update task.");
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // LOADING SCREEN
  // ===================================================

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5fafc] dark:bg-[#081C27]">

        <div className="flex flex-col items-center">

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#d9edf3] dark:border-[#3A5F71] border-t-[#006b8f]">

            <Loader2 className="h-5 w-5 animate-spin text-[#006b8f] dark:text-[#63C7D4]" />

          </div>

          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t("loadingTask")}</p>

        </div>

      </main>
    );
  }

  // ===================================================
  // MAIN ERROR SCREEN
  // ===================================================

  if (error && !title) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5fafc] dark:bg-[#081C27] px-6">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-[#3A5F71] bg-white dark:bg-[#102A38] p-8 text-center shadow-sm">

          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">

            <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-300" />

          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-[#E5F1F5]">
            {t("unableToLoadTask")}</h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">
            {error}
          </p>

          <Link
            href="/admin/tasks"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#00527a] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#003f5d]"
          >
            <ArrowLeft className="h-4 w-4" />

            {t("backToTasks")}</Link>

        </div>

      </main>
    );
  }

  // ===================================================
  // PAGE
  // ===================================================

  return (
    <main className="min-h-screen bg-[#f5fafc] dark:bg-[#081C27] px-4 py-8 md:px-8">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-7">

          <Link
            href="/admin/tasks"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#006b8f] dark:text-[#63C7D4] transition hover:text-[#004e6b]"
          >
            <ArrowLeft className="h-4 w-4" />

            {t("backToTasks")}</Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-[#E5F1F5]">
            {t("editTask")}</h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">
            {t("updateTaskDetailsAssignment")}</p>

        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">

            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {error}
            </span>

          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {successMessage && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">

            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <span>
              {successMessage}
            </span>

          </div>
        )}

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-[#dce9ee] bg-white dark:bg-[#102A38] dark:border-[#3A5F71] shadow-sm"
          >

            {/* FORM HEADER */}

            <div className="border-b border-[#e5eef2] dark:border-[#3A5F71] px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7fa] dark:bg-[#123C46]">

                  <FileText className="h-5 w-5 text-[#007c9e]" />

                </div>

                <div>

                  <h2 className="font-semibold text-slate-900 dark:text-[#E5F1F5]">
                    {t("taskInformation")}</h2>

                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">
                    {t("defineTheTaskDetails")}</p>

                </div>

              </div>

            </div>

            {/* FORM BODY */}

            <div className="space-y-6 px-6 py-6">

              {/* TITLE */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="title"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                  >
                    {t("taskTitle")}{" "}
                    <span className="text-red-500 dark:text-red-300">
                      *
                    </span>
                  </label>

                  <span className="text-xs text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400">
                    {title.length}/
                    {MAX_TITLE_LENGTH}
                  </span>

                </div>

                <input
                  id="title"
                  type="text"
                  value={title}
                  maxLength={
                    MAX_TITLE_LENGTH
                  }
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder={t("enterTaskTitle")}
                  className="w-full rounded-xl border border-[#d5e4ea] bg-white dark:bg-[#102A38] dark:border-[#3D6375] px-4 py-3 text-sm text-slate-700 dark:text-slate-200 dark:text-[#D7E7EC] outline-none placeholder:text-slate-400 dark:placeholder:text-[#7694A2] dark:text-slate-500 dark:text-slate-400 focus:border-[#007c9e] focus:ring-2 focus:ring-[#007c9e]/10"
                />

              </div>

              {/* DESCRIPTION */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="description"
                    className="text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                  >
                    {t("description")}</label>

                  <span className="text-xs text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400">
                    {description.length}/
                    {MAX_DESCRIPTION_LENGTH}
                  </span>

                </div>

                <textarea
                  id="description"
                  value={description}
                  maxLength={
                    MAX_DESCRIPTION_LENGTH
                  }
                  rows={6}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder={t("describeTheTask")}
                  className="w-full resize-none rounded-xl border border-[#d5e4ea] bg-white dark:bg-[#102A38] dark:border-[#3D6375] px-4 py-3 text-sm text-slate-700 dark:text-slate-200 dark:text-[#D7E7EC] outline-none placeholder:text-slate-400 dark:placeholder:text-[#7694A2] dark:text-slate-500 dark:text-slate-400 focus:border-[#007c9e] focus:ring-2 focus:ring-[#007c9e]/10"
                />

              </div>

              {/* EMPLOYEE */}

              <div>

                <label
                  id="assignedTo-label"
                  htmlFor="assignedTo"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                >
                  {t("assignEmployee")}{" "}
                  <span className="text-red-500 dark:text-red-300">
                    *
                  </span>
                </label>

                <div ref={dropdownRef} className="relative">
                  {/* TRIGGER BUTTON */}
                  <button
                    type="button"
                    id="assignedTo"
                    ref={triggerRef}
                    role="combobox"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="listbox"
                    aria-controls="employee-listbox"
                    aria-labelledby="assignedTo-label"
                    disabled={loading || saving}
                    onClick={() => {
                      if (!loading && !saving) {
                        setIsDropdownOpen((prev) => !prev);
                        if (!isDropdownOpen) setEmployeeSearch("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " " ||
                        event.key === "ArrowDown" ||
                        event.key === "ArrowUp"
                      ) {
                        event.preventDefault();
                        if (!isDropdownOpen) {
                          setIsDropdownOpen(true);
                        }
                      } else if (event.key === "Escape" && isDropdownOpen) {
                        event.preventDefault();
                        setIsDropdownOpen(false);
                      }
                    }}
                    className="flex min-h-[46px] w-full items-center gap-3 rounded-xl border border-[#d5e4ea] bg-white px-4 py-2.5 text-left text-sm outline-none transition focus:border-[#007c9e] focus:ring-2 focus:ring-[#007c9e]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3D6375] dark:bg-[#102A38] dark:text-slate-200"
                  >
                    <UserRound className="h-4 w-4 shrink-0 text-slate-400 dark:text-[#8FA8B4]" />

                    <div className="min-w-0 flex-1">
                      {selectedEmployee ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {getEmployeeName(selectedEmployee)}
                          </span>
                          <span className="truncate text-xs text-slate-400 dark:text-slate-500">
                            {selectedEmployee.email}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400 dark:text-[#7694A2]">
                          {loading
                            ? (language === "hi" ? "कर्मचारी लोड हो रहे हैं..." : "Loading employees...")
                            : (t("tasks.selectEmployee") || t("selectEmployee") || "Select employee...")}
                        </span>
                      )}
                    </div>

                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 dark:text-[#8FA8B4] ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* CUSTOM DROPDOWN PANEL */}
                  {isDropdownOpen && (
                    <div
                      id="employee-listbox"
                      role="listbox"
                      aria-labelledby="assignedTo-label"
                      className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[#d5e4ea] bg-white shadow-xl dark:border-[#3D6375] dark:bg-[#102A38]"
                    >
                      {/* SEARCH BAR */}
                      <div className="border-b border-[#E4EDF0] px-3 py-2.5 dark:border-[#3A5F71]">
                        <div className="flex items-center gap-2 rounded-xl border border-[#BDCED6] bg-[#F5F9FA] px-3 py-2 focus-within:border-[#087D8F] focus-within:ring-2 focus-within:ring-[#087D8F]/10 dark:border-[#3D6375] dark:bg-[#0D2430]">
                          <Search
                            size={13}
                            className="shrink-0 text-[#94A4AC] dark:text-[#8FA8B2]"
                          />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "ArrowDown") {
                                event.preventDefault();
                                if (filteredEmployees.length > 0) {
                                  setFocusedIndex(
                                    (prev) =>
                                      (prev + 1) % filteredEmployees.length
                                  );
                                }
                              } else if (event.key === "ArrowUp") {
                                event.preventDefault();
                                if (filteredEmployees.length > 0) {
                                  setFocusedIndex(
                                    (prev) =>
                                      (prev - 1 + filteredEmployees.length) %
                                      filteredEmployees.length
                                  );
                                }
                              } else if (event.key === "Enter") {
                                event.preventDefault();
                                if (
                                  focusedIndex >= 0 &&
                                  focusedIndex < filteredEmployees.length
                                ) {
                                  const chosen = filteredEmployees[focusedIndex];
                                  setAssignedTo(chosen._id);
                                  setIsDropdownOpen(false);
                                  setEmployeeSearch("");
                                  triggerRef.current?.focus();
                                }
                              } else if (event.key === "Escape") {
                                event.preventDefault();
                                setIsDropdownOpen(false);
                                setEmployeeSearch("");
                                triggerRef.current?.focus();
                              }
                            }}
                            placeholder={language === "hi" ? "नाम, विभाग या आईडी से खोजें..." : "Search by name, department or ID..."}
                            className="flex-1 bg-transparent text-sm text-[#365767] outline-none placeholder:text-[#A4B0B6] dark:text-[#C8DCE3] dark:placeholder:text-[#8FA8B2]"
                          />
                          {employeeSearch && (
                            <button
                              type="button"
                              onClick={() => setEmployeeSearch("")}
                              className="text-[#94A4AC] transition hover:text-[#C64B4B] dark:text-[#8FA8B2] dark:hover:text-[#E58A8A]"
                              aria-label={language === "hi" ? "खोज साफ़ करें" : "Clear search"}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* EMPLOYEE LIST */}
                      <div className="max-h-[290px] overflow-y-auto">
                        {filteredEmployees.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-8 text-center">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF6F9] dark:bg-[#123C46]">
                              <UserRound
                                size={18}
                                className="text-[#94A4AC] dark:text-[#8FA8B2]"
                              />
                            </div>
                            <p className="text-sm font-medium text-[#8497A1] dark:text-[#9FB6C0]">
                              {language === "hi" ? "कोई कर्मचारी नहीं मिला" : "No employees found"}
                            </p>
                            {employeeSearch && (
                              <p className="text-xs text-[#A4B0B6] dark:text-[#8FA8B2]">
                                {language === "hi" ? "एक अलग खोज शब्द आज़माएं" : "Try a different search term"}
                              </p>
                            )}
                          </div>
                        ) : (
                          filteredEmployees.map((emp, idx) => {
                            const isSelected =
                              String(emp._id) === String(assignedTo);
                            const isFocused = focusedIndex === idx;

                            return (
                              <button
                                key={emp._id}
                                id={`employee-option-${emp._id}`}
                                ref={(el) => {
                                  optionsRef.current[idx] = el;
                                }}
                                role="option"
                                aria-selected={isSelected}
                                type="button"
                                onClick={() => {
                                  setAssignedTo(emp._id);
                                  setIsDropdownOpen(false);
                                  setEmployeeSearch("");
                                  triggerRef.current?.focus();
                                }}
                                onMouseEnter={() => setFocusedIndex(idx)}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                                  isSelected
                                    ? "bg-[#EAF6F9] dark:bg-[#123C46]"
                                    : isFocused
                                      ? "bg-[#F0F8FA] dark:bg-[#18333F]"
                                      : "hover:bg-[#F0F8FA] dark:hover:bg-[#18333F]"
                                }`}
                              >
                                {/* AVATAR INITIALS */}
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF6F9] text-xs font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                                  {getEmployeeInitials(emp)}
                                </span>

                                {/* DETAILS */}
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-bold text-[#365767] dark:text-[#C8DCE3]">
                                    {getEmployeeName(emp)}
                                  </span>
                                  <span className="block truncate text-xs text-[#94A4AC] dark:text-[#8FA8B2]">
                                    {emp.email}
                                    {emp.department
                                      ? ` • ${emp.department}`
                                      : ""}
                                    {emp.employeeId
                                      ? ` • ID: ${emp.employeeId}`
                                      : ""}
                                  </span>
                                </span>

                                {/* CHECK ICON IF SELECTED */}
                                {isSelected && (
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#087D8F] text-white dark:bg-[#4CD2DA] dark:text-[#081C27]">
                                    <Check size={12} strokeWidth={2.5} />
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedEmployee && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f4fafc] dark:bg-[#0D2430] px-4 py-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dff3f7] dark:bg-[#123C46] text-sm font-bold text-[#007c9e]">

                      {selectedEmployee.firstName?.[0] || ""}

                      {selectedEmployee.lastName?.[0] || ""}

                    </div>

                    <div className="min-w-0">

                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-[#D7E7EC]">
                        {getEmployeeName(
                          selectedEmployee
                        )}
                      </p>

                      <p className="truncate text-xs text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">
                        {selectedEmployee.email}
                      </p>

                    </div>

                  </div>
                )}

              </div>

              {/* PRIORITY + STATUS */}

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* PRIORITY */}

                <div>

                  <label
                    htmlFor="priority"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                  >
                    {t("priority_text")}</label>

                  <div className="relative">

                    <Flag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400" />

                    <select
                      id="priority"
                      value={priority}
                      onChange={(event) =>
                        setPriority(
                          event.target
                            .value as Priority
                        )
                      }
                      className="w-full appearance-none rounded-xl border border-[#d5e4ea] bg-white dark:bg-[#102A38] dark:border-[#3D6375] py-3 pl-11 pr-10 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-[#007c9e] focus:ring-2 focus:ring-[#007c9e]/10"
                    >

                      <option value="LOW">
                        {t("priority.low") || t("low") || "Low"}</option>

                      <option value="MEDIUM">
                        {t("priority.medium") || t("medium") || "Medium"}</option>

                      <option value="HIGH">
                        {t("priority.high") || t("high") || "High"}</option>

                    </select>

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400" />

                  </div>

                </div>

                {/* STATUS (ALWAYS PENDING & READ-ONLY) */}

                <div>

                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                  >
                    {t("common.status") || t("status_text") || "Status"}</label>

                  <div className="relative">

                    <div
                      id="status"
                      aria-readonly="true"
                      className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-[#d5e4ea] bg-slate-50/80 px-4 py-3 text-sm text-slate-700 cursor-not-allowed select-none dark:border-[#3D6375] dark:bg-[#0D2430]/70 dark:text-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400" />
                        <span className="font-medium text-slate-800 dark:text-[#D7E7EC]">
                          {t("status.pending") || t("pending") || "Pending"}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-[#18333F] dark:text-slate-400">
                        <Lock className="h-3 w-3" />
                        <span>{t("common.readOnly") || t("readOnly") || (language === "hi" ? "केवल पढ़ने के लिए" : "Read-only")}</span>
                      </span>
                    </div>

                  </div>

                </div>

              </div>

              {/* DUE DATE */}

              <div>

                <label
                  htmlFor="dueDate"
                  className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]"
                >
                  {t("dueDate")}{" "}
                  <span className="text-red-500 dark:text-red-300">
                    *
                  </span>
                </label>

                <div className="relative">

                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#8FA8B4]" />

                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-[#d5e4ea] bg-white dark:bg-[#102A38] dark:border-[#3D6375] py-3 pl-11 pr-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-[#007c9e] focus:ring-2 focus:ring-[#007c9e]/10"
                  />

                </div>

              </div>

            </div>

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 border-t border-[#e5eef2] dark:border-[#3A5F71] px-6 py-5 sm:flex-row sm:justify-end">

              <Link
                href="/admin/tasks"
                className="inline-flex items-center justify-center rounded-xl border border-[#d5e4ea] bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#3D6375] dark:bg-[#102A38] dark:text-slate-300 dark:hover:bg-[#18333F]"
              >
                {t("common.cancel") || t("cancel") || "Cancel"}</Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00527a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#003f5d] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#087D8F] dark:hover:bg-[#0798AA]"
              >

                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />

                    {t("common.saving") || t("saving") || (language === "hi" ? "सहेजा जा रहा है..." : "Saving...")}</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />

                    {t("common.saveChanges") || t("saveChanges") || (language === "hi" ? "परिवर्तन सहेजें" : "Save Changes")}</>
                )}

              </button>

            </div>

          </form>

          {/* =================================================
              RIGHT SIDEBAR
          ================================================= */}

          <aside className="space-y-5">

            {/* PREVIEW */}

            <div className="rounded-2xl border border-[#dce9ee] bg-white dark:bg-[#102A38] dark:border-[#3A5F71] p-5 shadow-sm">

              <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-[#D7E7EC]">
                {t("tasks.taskPreview") || t("taskPreview1") || (language === "hi" ? "कार्य पूर्वावलोकन" : "Task Preview")}</h2>

              <div className="rounded-xl border border-[#e0ebef] dark:border-[#3D6375] bg-[#fbfdfe] dark:bg-[#0D2430] p-4">

                <div className="mb-4 flex items-start justify-between gap-3">

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9f7fa] dark:bg-[#123C46]">

                    <FileText className="h-4 w-4 text-[#007c9e]" />

                  </div>

                  <span className="rounded-full bg-[#eef4ff] dark:bg-[#173A50] px-3 py-1 text-[11px] font-bold uppercase text-[#5078d8] dark:text-[#8DB4FF]">
                    {t(`priority.${priority.toLowerCase()}`) || priority}
                  </span>

                </div>

                <h3 className="break-words text-sm font-bold text-slate-800 dark:text-[#D7E7EC]">
                  {title || (language === "hi" ? "आपका कार्य शीर्षक" : "Your task title")}
                </h3>

                <p className="mt-2 max-h-20 overflow-hidden text-xs leading-5 text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">
                  {description || (language === "hi" ? "कार्य विवरण यहाँ दिखाई देगा।" : "Task description will appear here.")}
                </p>

                <div className="my-4 h-px bg-[#e3edf0]" />

                {/* ASSIGNED */}

                <div className="flex items-start gap-3">

                  <UserRound className="mt-0.5 h-4 w-4 text-[#0084a4]" />

                  <div>

                    <p className="text-[11px] text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400">
                      {t("tasks.assignedTo") || t("assignedTo") || (language === "hi" ? "सौंपा गया" : "Assigned To")}</p>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]">
                      {selectedEmployee
                        ? getEmployeeName(
                            selectedEmployee
                          )
                        : (language === "hi" ? "असाइन नहीं किया गया" : "Not assigned")}
                    </p>

                  </div>

                </div>

                {/* DUE DATE */}

                <div className="mt-4 flex items-start gap-3">

                  <CalendarDays className="mt-0.5 h-4 w-4 text-[#0084a4]" />

                  <div>

                    <p className="text-[11px] text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400">
                      {t("tasks.dueDate") || t("dueDate") || (language === "hi" ? "नियत तारीख" : "Due Date")}</p>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]">
                      {dueDate || (language === "hi" ? "चयनित नहीं" : "Not selected")}
                    </p>

                  </div>

                </div>

                {/* STATUS */}

                <div className="mt-4 flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#0084a4]" />

                  <div>

                    <p className="text-[11px] text-slate-400 dark:text-[#8FA8B4] dark:text-slate-400">
                      {t("common.status") || t("status_text") || (language === "hi" ? "स्थिति" : "Status")}</p>

                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 dark:text-[#C8DCE3]">
                      {status === "PENDING"
                        ? (t("status.pending") || "Pending")
                        : status === "IN_PROGRESS"
                          ? (t("status.in_progress") || "In Progress")
                          : (t("status.completed") || "Completed")}
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* GUIDELINES */}

            <div className="rounded-2xl border border-[#b9e0e8] bg-[#f4fbfd] dark:border-[#3A5F71] dark:bg-[#0D2430] p-5">

              <div className="mb-3 flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#dff4f7] dark:bg-[#123C46]">

                  <AlertCircle className="h-4 w-4 text-[#007c9e]" />

                </div>

                <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {t("tasks.creationGuidelines") || t("taskGuidelines1") || (language === "hi" ? "कार्य दिशानिर्देश" : "Task Guidelines")}</h2>

              </div>

              <ul className="space-y-2 text-xs leading-5 text-slate-500 dark:text-slate-400 dark:text-[#8FA8B4] dark:text-[#9FB6C0]">

                <li className="flex gap-2">
                  <span className="text-[#007c9e]">
                    •
                  </span>

                  {t("tasks.guideline1") || t("useAClearAnd") || (language === "hi" ? "एक स्पष्ट और संक्षिप्त शीर्षक का उपयोग करें।" : "Use a clear and concise title.")}</li>

                <li className="flex gap-2">
                  <span className="text-[#007c9e]">
                    •
                  </span>

                  {t("tasks.guideline2") || t("includeEnoughContextIn") || (language === "hi" ? "विवरण में पर्याप्त संदर्भ शामिल करें।" : "Include enough context in the description.")}</li>

                <li className="flex gap-2">
                  <span className="text-[#007c9e]">
                    •
                  </span>

                  {t("tasks.guideline3") || t("assignTheTaskTo") || (language === "hi" ? "कार्य सही टीम के सदस्य को सौंपें।" : "Assign the task to the right team member.")}</li>

                <li className="flex gap-2">
                  <span className="text-[#007c9e]">
                    •
                  </span>

                  {t("tasks.guideline4") || t("setARealisticDeadline1") || (language === "hi" ? "एक यथार्थवादी समय सीमा निर्धारित करें।" : "Set a realistic deadline.")}</li>

              </ul>

            </div>

          </aside>

        </div>

      </div>

    </main>
  );
}