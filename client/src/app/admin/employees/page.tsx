"use client";

import {
  Users,
  UserCheck,
  UserRoundX,
  Building2,
  Eye,
  Pencil,
  Ban,
  Search,
  Filter,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Crown,
  Loader2,
  UserPlus,
  ArrowUpRight,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/components/ui/Modal";

import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { ROLES, getRoleLabel, normalizeRole } from "@/constants/rbac";
import { useDepartments } from "@/hooks/useDepartments";
import { GoToPage } from "@/components/ui/GoToPage";
import { useDesignations } from "@/hooks/useDesignations";
import { invalidateMasterData } from "@/service/masterData.service";
import { useAuth } from "@/context/AuthContext";

// =====================================================
// TYPES
// =====================================================

interface Employee {
  _id?: string;
  id?: string;

  firstName?: string;
  lastName?: string;
  name?: string;

  email?: string;
  phone?: string;

  employeeId?: string;

  role?: string;
  department?: string;
  designation?: string;

  status?: string;
  isBlocked?: boolean;

  profilePhoto?: string | null;

  totalTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  overdueTasks?: number;
  completionRate?: number;

  createdAt?: string;
}

interface EmployeeResponse {
  success?: boolean;
  message?: string;
  data?:
  | Employee[]
  | {
    employees?: Employee[];
    total?: number;
    totalEmployees?: number;
    activeEmployees?: number;
    inactiveEmployees?: number;
  };
}

interface Task {
  _id?: string;
  id?: string;
  assignedTo?: string | { _id?: string; id?: string } | null;
  status?: string;
}

interface TaskResponse {
  success?: boolean;
  message?: string;
  data?:
  | Task[]
  | {
    tasks?: Task[];
    total?: number;
    pagination?: {
      total?: number;
      page?: number;
      limit?: number;
      totalPages?: number;
    };
  };
  pagination?: {
    totalTasks?: number;
    totalPages?: number;
    currentPage?: number;
    perPage?: number;
  };
}

function getAssignedEmployeeId(assignedTo?: Task["assignedTo"]): string {
  if (!assignedTo) return "";
  if (typeof assignedTo === "string") return assignedTo;
  return assignedTo._id || assignedTo.id || "";
}

function normalizeEmployeeStatusParam(param: string | null): string {
  if (!param) return "ALL";
  const lower = param.toLowerCase().trim();
  if (lower === "active") return "Active";
  if (lower === "inactive") return "Inactive";
  return "ALL";
}

function getEmployeeStatus(employee: Employee) {
  if (employee.isBlocked === true) return "Inactive";
  const status = employee.status?.toLowerCase();
  if (status === "inactive" || status === "disabled" || status === "blocked") {
    return "Inactive";
  }
  return "Active";
}

function getInitials(employee: Employee) {
  const name =
    employee.name ||
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

  if (!name) return "EM";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");
}

// Avatar color palette for deterministic initial avatars matching MindMatrix system
const AVATAR_THEMES = [
  { bg: "bg-[#EBF5FF] dark:bg-[#0D2E4D]", text: "text-[#087FE8] dark:text-[#38BDF8]" },
  { bg: "bg-[#DDF3F7] dark:bg-[#0C384F]", text: "text-[#007F9E] dark:text-[#22D3EE]" },
  { bg: "bg-[#E6F8F1] dark:bg-[#093527]", text: "text-[#00A878] dark:text-[#34D399]" },
  { bg: "bg-[#FFF8EB] dark:bg-[#3D2808]", text: "text-[#D97706] dark:text-[#FBBF24]" },
  { bg: "bg-[#F3E8FF] dark:bg-[#281140]", text: "text-[#9333EA] dark:text-[#C084FC]" },
  { bg: "bg-[#FEF2F2] dark:bg-[#3A1418]", text: "text-[#DC2626] dark:text-[#F87171]" },
];

function getAvatarTheme(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_THEMES[Math.abs(hash) % AVATAR_THEMES.length];
}

// =====================================================
// MINI BAR SPARKLINE CHART COMPONENT
// =====================================================

function StatMiniBarChart({
  color,
  bars = [35, 55, 40, 70, 60, 85, 100],
}: {
  color: string;
  bars?: number[];
}) {
  return (
    <div className="flex items-end gap-[3px] h-[34px] w-[46px] shrink-0" aria-hidden="true">
      {bars.map((heightPercent, idx) => (
        <span
          key={idx}
          className="w-[3.5px] rounded-full transition-all duration-300"
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

// =====================================================
// MAIN COMPONENT
// =====================================================

function AdminEmployeesContent() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = useMemo(
    () => normalizeEmployeeStatusParam(searchParams.get("status")),
    [searchParams]
  );

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { currentUser } = useAuth();

  // Authenticated user's role, used for edit permissions only.
  const currentRole = String(currentUser?.role || "");
  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [role, setRole] = useState("ALL");

  // Synchronize status filter changes with URL
  const handleStatusChange = (newStatus: string) => {
    const currentParam = searchParams.get("status")?.toLowerCase() || "";
    const targetParam =
      newStatus === "Active"
        ? "active"
        : newStatus === "Inactive"
          ? "inactive"
          : "";

    if (currentParam !== targetParam) {
      const params = new URLSearchParams(searchParams.toString());
      if (targetParam) {
        params.set("status", targetParam);
      } else {
        params.delete("status");
      }
      const query = params.toString();
      const newPath = query ? `/admin/employees?${query}` : `/admin/employees`;
      router.push(newPath, { scroll: false });
    }
    setPage(1);
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Modals state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEmployeeModalClosing, setIsEmployeeModalClosing] = useState(false);
  const [blockConfirmEmployee, setBlockConfirmEmployee] = useState<Employee | null>(null);
  const [blockingEmployeeId, setBlockingEmployeeId] = useState<string | null>(null);

  // Employee profile modal animation / scroll lock
  const closeEmployeeModal = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSelectedEmployee(null);
      setIsEmployeeModalClosing(false);
      return;
    }

    setIsEmployeeModalClosing(true);
    window.setTimeout(() => {
      setSelectedEmployee(null);
      setIsEmployeeModalClosing(false);
    }, 170);
  };

  useEffect(() => {
    if (!selectedEmployee) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedEmployee]);

  // Add Employee Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    role: "employee",
    password: "",
  });

  const activeAddDepartment = addForm.department || masterDeptNames[0] || "";

  const { designationNames: addFormDesigNames } = useDesignations({
    department: activeAddDepartment,
    status: "ACTIVE",
  });

  // ===================================================
  // FETCH EMPLOYEES + TASK COUNTS
  // ===================================================

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [employeeResponse, taskResponse] = await Promise.all([
        apiRequest<EmployeeResponse>("/api/users/employees", {
          method: "GET",
        }),
        apiRequest<TaskResponse>("/api/tasks?limit=1000", {
          method: "GET",
        }),
      ]);

      const employeeData = employeeResponse?.data;
      const taskData = taskResponse?.data;

      const employeeList: Employee[] = Array.isArray(employeeData)
        ? employeeData
        : employeeData?.employees ?? [];

      const taskList: Task[] = Array.isArray(taskData)
        ? taskData
        : taskData?.tasks ?? [];

      const taskStats = new Map<
        string,
        { total: number; completed: number }
      >();

      taskList.forEach((task) => {
        const employeeId = getAssignedEmployeeId(task.assignedTo);
        if (!employeeId) return;

        const current = taskStats.get(employeeId) || {
          total: 0,
          completed: 0,
        };

        current.total += 1;
        if (String(task.status || "").toUpperCase() === "COMPLETED") {
          current.completed += 1;
        }

        taskStats.set(employeeId, current);
      });

      const enrichedEmployees = employeeList.map((employee) => {
        const employeeId = employee._id || employee.id || "";
        const stats = taskStats.get(employeeId);
        const totalTasks = stats?.total ?? Number(employee.totalTasks ?? 0);
        const completedTasks =
          stats?.completed ?? Number(employee.completedTasks ?? 0);

        return {
          ...employee,
          totalTasks,
          completedTasks,
          completionRate:
            totalTasks > 0
              ? Math.round((completedTasks / totalTasks) * 100)
              : 0,
        };
      });

      setEmployees(enrichedEmployees);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load employees";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialEmployees() {
      try {
        const [employeeResponse, taskResponse] = await Promise.all([
          apiRequest<EmployeeResponse>("/api/users/employees", {
            method: "GET",
          }),
          apiRequest<TaskResponse>("/api/tasks?limit=1000", {
            method: "GET",
          }),
        ]);

        if (!isMounted) return;

        const employeeData = employeeResponse?.data;
        const taskData = taskResponse?.data;

        const employeeList: Employee[] = Array.isArray(employeeData)
          ? employeeData
          : employeeData?.employees ?? [];

        const taskList: Task[] = Array.isArray(taskData)
          ? taskData
          : taskData?.tasks ?? [];

        const taskStats = new Map<
          string,
          { total: number; completed: number }
        >();

        taskList.forEach((task) => {
          const employeeId = getAssignedEmployeeId(task.assignedTo);
          if (!employeeId) return;

          const current = taskStats.get(employeeId) || {
            total: 0,
            completed: 0,
          };

          current.total += 1;
          if (String(task.status || "").toUpperCase() === "COMPLETED") {
            current.completed += 1;
          }

          taskStats.set(employeeId, current);
        });

        const enrichedEmployees = employeeList.map((employee) => {
          const employeeId = employee._id || employee.id || "";
          const stats = taskStats.get(employeeId);
          const totalTasks = stats?.total ?? Number(employee.totalTasks ?? 0);
          const completedTasks =
            stats?.completed ?? Number(employee.completedTasks ?? 0);

          return {
            ...employee,
            totalTasks,
            completedTasks,
            completionRate:
              totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0,
          };
        });

        setEmployees(enrichedEmployees);
      } catch (err: unknown) {
        if (!isMounted) return;
        const errorMsg = err instanceof Error ? err.message : "Failed to load employees";
        setError(errorMsg);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchInitialEmployees();

    return () => {
      isMounted = false;
    };
  }, []);

  // All accounts remain visible in the directory.
  const visibleEmployees = employees;
  const totalEmployees = visibleEmployees.length;

  const activeEmployees = visibleEmployees.filter(
    (employee) => getEmployeeStatus(employee) === "Active",
  ).length;

  const inactiveEmployees = totalEmployees - activeEmployees;

  // ===================================================
  // DEPARTMENTS & ROLES
  // ===================================================

  const departments = useMemo(() => {
    const values = visibleEmployees
      .map((employee) => employee.department)
      .filter(Boolean) as string[];

    const combined = Array.from(new Set([...masterDeptNames, ...values]));
    return combined;
  }, [visibleEmployees, masterDeptNames]);

  const departmentsCount = departments.length;

  const roles = useMemo(() => {
    const values = employees
      .map((employee) => employee.role)
      .filter(Boolean) as string[];

    return [...new Set(values)];
  }, [employees]);

  // ===================================================
  // FILTERING
  // ===================================================

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const name =
        employee.name ||
        `${employee.firstName || ""} ${employee.lastName || ""}`.trim();

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.employeeId?.toLowerCase().includes(query) ||
        employee.department?.toLowerCase().includes(query);

      const matchesDepartment =
        department === "ALL" || employee.department === department;

      const employeeStatus = getEmployeeStatus(employee);
      const matchesStatus = status === "ALL" || employeeStatus === status;

      const matchesRole =
        role === "ALL" ||
        employee.role === role ||
        normalizeRole(employee.role) === normalizeRole(role);

      return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
    });
  }, [employees, search, department, status, role]);

  // ===================================================
  // PAGINATION
  // ===================================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / pageSize),
  );

  const safePage = Math.min(page, totalPages);

  const paginatedEmployees = filteredEmployees.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  // ===================================================
  // EDIT EMPLOYEE
  // ===================================================

  const handleEditEmployee = (employee: Employee) => {
    const databaseId = employee._id || employee.id;
    if (!databaseId) {
      setError(t("employeeDatabaseIdIs") || "Employee database ID is required.");
      return;
    }
    router.push(`/admin/employees/${databaseId}`);
  };

  // ===================================================
  // BLOCK / UNBLOCK EMPLOYEE
  // ===================================================

  const handleToggleBlock = async (employee: Employee) => {
    const databaseId = employee._id || employee.id;
    if (!databaseId) {
      setError(t("employeeDatabaseIdIs") || "Employee database ID is required.");
      return;
    }

    try {
      setBlockingEmployeeId(databaseId);
      setError("");

      const response = await apiRequest<{
        success?: boolean;
        message?: string;
        data?: {
          employee?: {
            isBlocked?: boolean;
          };
        };
      }>(`/api/users/employees/${databaseId}/block`, {
        method: "PATCH",
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Failed to update employee status",
        );
      }

      const newBlockedState =
        response.data?.employee?.isBlocked ?? !employee.isBlocked;

      setEmployees((currentEmployees) =>
        currentEmployees.map((item) => {
          const itemId = item._id || item.id;
          if (itemId !== databaseId) return item;
          return {
            ...item,
            isBlocked: newBlockedState,
            status: newBlockedState ? "blocked" : "active",
          };
        }),
      );

      setSelectedEmployee((current) => {
        if (!current || (current._id || current.id) !== databaseId) {
          return current;
        }
        return {
          ...current,
          isBlocked: newBlockedState,
          status: newBlockedState ? "blocked" : "active",
        };
      });

      setBlockConfirmEmployee(null);
      const successMsg =
        response?.message ||
        (newBlockedState
          ? "Employee blocked successfully."
          : "Employee unblocked successfully.");
      showToast.success(successMsg);
    } catch (err: unknown) {
      console.error("Block/unblock employee error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to update employee status";
      setError(errorMsg);
      showToast.error(errorMsg);
    } finally {
      setBlockingEmployeeId(null);
    }
  };

  // ===================================================
  // ADD EMPLOYEE SUBMIT HANDLER
  // ===================================================

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim() || !addForm.password) {
      showToast.error("Please fill in all required fields (First Name, Last Name, Email, Password).");
      return;
    }

    try {
      setAddingEmployee(true);
      const res = await apiRequest<{ success?: boolean; message?: string }>("/api/admin/administrators", {
        method: "POST",
        body: JSON.stringify({
          firstName: addForm.firstName.trim(),
          lastName: addForm.lastName.trim(),
          email: addForm.email.trim().toLowerCase(),
          phone: addForm.phone.trim(),
          department: activeAddDepartment,
          designation: addForm.designation.trim() || "Employee",
          role: addForm.role,
          password: addForm.password,
        }),
      });

      if (res?.success) {
        showToast.success(res.message || "Employee created successfully.");
        invalidateMasterData("all");
        setIsAddModalOpen(false);
        setAddForm({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          department: masterDeptNames[0] || "",
          designation: "",
          role: "employee",
          password: "",
        });
        await loadEmployees();
      } else {
        throw new Error(res?.message || "Failed to create employee.");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to create employee.";
      showToast.error(errorMsg);
    } finally {
      setAddingEmployee(false);
    }
  };

  // ===================================================
  // LOADING STATE
  // ===================================================

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-74px)] bg-[#F4F9FB] p-4 sm:p-8 dark:bg-[#081C27]">
        <div className="mx-auto max-w-[1550px] animate-pulse space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-36 rounded bg-[#D6E4EC] dark:bg-[#1E435E]" />
              <div className="h-7 w-52 rounded-lg bg-[#D6E4EC] dark:bg-[#1E435E]" />
              <div className="h-4 w-80 rounded bg-[#D6E4EC] dark:bg-[#1E435E]" />
            </div>
            <div className="flex gap-2.5">
              <div className="h-10 w-44 rounded-xl bg-[#D6E4EC] dark:bg-[#1E435E]" />
              <div className="h-10 w-36 rounded-xl bg-[#D6E4EC] dark:bg-[#1E435E]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[96px] rounded-[12px] bg-white border border-[#E2E8F0] dark:border-[#2A4858] dark:bg-[#102A38]"
              />
            ))}
          </div>
          <div className="h-[520px] rounded-[14px] bg-white border border-[#D6E4EC] dark:border-[#1E435E] dark:bg-[#0B2538]" />
        </div>
      </main>
    );
  }

  // ===================================================
  // ERROR STATE
  // ===================================================

  if (error && employees.length === 0) {
    return (
      <main className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-[#F4F9FB] p-6 dark:bg-[#081C27]">
        <div className="w-full max-w-md rounded-2xl border border-[#FECACA] bg-white p-8 text-center shadow-lg dark:border-[#611C23] dark:bg-[#0B2538]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3A1418] dark:text-[#F87171]">
            <Users size={24} />
          </div>
          <h2 className="mt-4 text-base font-bold text-[#123B5D] dark:text-white">
            {t("common.error") || "Error Loading Employees"}
          </h2>
          <p className="mt-1.5 text-xs text-[#718899] dark:text-[#8CB0C7]">
            {error}
          </p>
          <button
            type="button"
            onClick={() => void loadEmployees()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#007F9E] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#006E8A] transition-colors cursor-pointer"
          >
            {t("tryAgain") || "Try Again"}
          </button>
        </div>
      </main>
    );
  }

  // ===================================================
  // MAIN ENTERPRISE UI (MINDMATRIX DESIGN SYSTEM)
  // ===================================================

  const hasActiveFilters = Boolean(
    search || department !== "ALL" || status !== "ALL" || role !== "ALL"
  );

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#F4F9FB] dark:bg-[#081C27] px-4 sm:px-8 py-6 sm:py-7">
      <div className="mx-auto max-w-[1550px] flex flex-col space-y-6">

        {/* =================================================
            1. PAGE HEADER (CLEAN ENTERPRISE DASHBOARD HEADER)
        ================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#007F9E] dark:text-[#22D3EE]">
                {language === "hi" ? "कार्यक्षेत्र अवलोकन" : "WORKSPACE DIRECTORY"}
              </p>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold tracking-tight text-[#123B5D] dark:text-white">
              {t("employees.employeesTitle") || "Employees"}
            </h1>
            <p className="mt-0.5 text-xs sm:text-[13px] text-[#718899] dark:text-[#8CB0C7] leading-relaxed">
              {t("employees.employeesSubtitle") || "Manage your organization's workforce, departments, and access roles."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
            {/* SECONDARY ACTION: MANAGE DEPARTMENTS */}
            <button
              type="button"
              onClick={() => router.push("/admin/departments")}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl border border-[#D6E4EC] bg-white px-3.5 sm:px-4 text-xs sm:text-[13px] font-semibold text-[#123B5D] shadow-2xs hover:bg-[#EEF5F9] hover:border-[#CBDCE7] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#12364E] transition-all cursor-pointer"
            >
              <Building2 size={16} className="text-[#718899] dark:text-[#8CB0C7]" />
              <span>{t("employees.manageDepartments") || "Manage Departments"}</span>
            </button>
          </div>
        </div>

        {/* =================================================
            2. TOP SUMMARY METRIC CARDS (MATCHING TASKS CARDS DESIGN SYSTEM)
        ================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">

          {/* CARD 1: TOTAL EMPLOYEES */}
          <button
            type="button"
            onClick={() => {
              handleStatusChange("ALL");
              setDepartment("ALL");
              setRole("ALL");
              setSearch("");
              setPage(1);
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${status === "ALL" && department === "ALL" && role === "ALL" && !search
                ? "border-[#00A6C7] bg-[#EFF8FB] ring-1 ring-[#00A6C7]/30 dark:border-[#00A6C7] dark:bg-[#123C46]/40"
                : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#FAFDFE] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
              }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
                  <Users size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("employees.totalEmployees") || "Total Employees"}
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
              />
            </div>

            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[28px] font-bold text-[#0284C7] dark:text-[#38BDF8] leading-[34px] tracking-[-0.02em] tabular-nums">
                  {totalEmployees}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                  <span>{t("employees.activeWorkforce") || (language === "hi" ? "सक्रिय कार्यबल" : "Active workforce")}</span>
                </div>
              </div>
              <StatMiniBarChart color="#00A6C7" bars={[32, 50, 42, 68, 55, 80, 100]} />
            </div>
          </button>

          {/* CARD 2: ACTIVE EMPLOYEES */}
          <button
            type="button"
            onClick={() => {
              handleStatusChange("Active");
              setDepartment("ALL");
              setRole("ALL");
              setSearch("");
              setPage(1);
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${status === "Active"
                ? "border-emerald-400 bg-[#F3FCF8] ring-1 ring-emerald-400/30 dark:border-emerald-600 dark:bg-emerald-950/30"
                : "border-[#CBD5E1] bg-white hover:border-emerald-400 hover:bg-[#F8FDFB] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
              }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#ECFDF5] text-[#00A878] dark:bg-[#064E3B] dark:text-[#34D399]">
                  <UserCheck size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("employees.activeEmployees") || "Active Employees"}
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
              />
            </div>

            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[28px] font-bold text-[#00A878] dark:text-[#34D399] leading-[34px] tracking-[-0.02em] tabular-nums">
                  {activeEmployees}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#00A878] dark:text-[#34D399]">
                  <span>{language === "hi" ? "वर्तमान में सक्रिय" : "Currently active"}</span>
                </div>
              </div>
              <StatMiniBarChart color="#00A878" bars={[38, 58, 52, 75, 68, 92, 88]} />
            </div>
          </button>

          {/* CARD 3: INACTIVE EMPLOYEES */}
          <button
            type="button"
            onClick={() => {
              handleStatusChange("Inactive");
              setDepartment("ALL");
              setRole("ALL");
              setSearch("");
              setPage(1);
            }}
            className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs cursor-pointer ${status === "Inactive"
                ? "border-amber-400 bg-[#FFFDF5] ring-1 ring-amber-400/30 dark:border-amber-600 dark:bg-amber-950/30"
                : "border-[#CBD5E1] bg-white hover:border-amber-400 hover:bg-[#FFFDF7] dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]"
              }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#FFFBEB] text-[#F2A51A] dark:bg-[#451A03] dark:text-[#FBBF24]">
                  <UserRoundX size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("employees.inactiveEmployees") || "Inactive Employees"}
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
              />
            </div>

            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[28px] font-bold text-[#D97706] dark:text-[#FBBF24] leading-[34px] tracking-[-0.02em] tabular-nums">
                  {inactiveEmployees}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#D97706] dark:text-[#FBBF24]">
                  <span>{language === "hi" ? "निष्क्रिय खाते" : "Inactive accounts"}</span>
                </div>
              </div>
              <StatMiniBarChart color="#F59E0B" bars={[25, 42, 38, 70, 58, 85, 95]} />
            </div>
          </button>

          {/* CARD 4: DEPARTMENTS */}
          <button
            type="button"
            onClick={() => router.push("/admin/departments")}
            className="group relative flex flex-col justify-between rounded-[12px] border border-[#CBD5E1] bg-white p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:border-purple-400 hover:bg-[#FAF8FF] hover:shadow-xs dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A] cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#F3E8FF] text-[#9333EA] dark:bg-[#281140] dark:text-[#C084FC]">
                  <Building2 size={13} strokeWidth={2.4} />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
                  {t("common.departments") || "Departments"}
                </span>
              </div>
              <ArrowUpRight
                size={14}
                className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
              />
            </div>

            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[28px] font-bold text-[#9333EA] dark:text-[#C084FC] leading-[34px] tracking-[-0.02em] tabular-nums">
                  {departmentsCount}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] text-[#9333EA] dark:text-[#C084FC]">
                  <span>{language === "hi" ? "सक्रिय कार्यक्षेत्र" : "Active workspaces"}</span>
                </div>
              </div>
              <StatMiniBarChart color="#9333EA" bars={[30, 48, 42, 65, 55, 78, 85]} />
            </div>
          </button>

        </div>

        {/* =================================================
            3. EMPLOYEES DIRECTORY CARD & TABLE
        ================================================= */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#007F9E] dark:text-[#22D3EE]">
                {language === "hi" ? "कर्मचारी सूची" : "EMPLOYEE DIRECTORY"}
              </span>
              <span className="inline-flex items-center rounded-md bg-[#EEF5F9] px-2 py-0.5 text-[11px] font-semibold text-[#007F9E] dark:bg-[#0C384F] dark:text-[#22D3EE]">
                {filteredEmployees.length}
              </span>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#D6E4EC] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E435E] dark:bg-[#0B2538] overflow-hidden">

            {/* FILTER / SEARCH TOOLBAR */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 sm:p-4 border-b border-[#E9F0F4] dark:border-[#1E435E] bg-white dark:bg-[#0B2538]">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* FILTERS BADGE */}
                <div className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] px-3 text-xs font-semibold text-[#718899] dark:border-[#1E435E] dark:bg-[#082030] dark:text-[#8CB0C7]">
                  <Filter size={14} className="text-[#007F9E] dark:text-[#22D3EE]" />
                  <span>{t("common.filters") || "Filters"}</span>
                </div>

                {/* DEPARTMENT DROPDOWN */}
                <div className="relative">
                  <select
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      setPage(1);
                    }}
                    className={`h-9 sm:h-10 appearance-none rounded-xl border pl-3 pr-8 text-xs sm:text-[13px] font-medium outline-none transition cursor-pointer focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:focus:border-[#22D3EE] ${department !== "ALL"
                        ? "border-[#007F9E] bg-[#EEF8FA] text-[#007F9E] font-semibold dark:border-[#22D3EE] dark:bg-[#0C384F] dark:text-[#22D3EE]"
                        : "border-[#D6E4EC] bg-white text-[#123B5D] hover:bg-[#F4F9FB] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#E2EEF5] dark:hover:bg-[#102B3C]"
                      }`}
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
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718899] dark:text-[#8CB0C7]"
                  />
                </div>

                {/* ROLE DROPDOWN */}
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setPage(1);
                    }}
                    className={`h-9 sm:h-10 appearance-none rounded-xl border pl-3 pr-8 text-xs sm:text-[13px] font-medium outline-none transition cursor-pointer focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:focus:border-[#22D3EE] ${role !== "ALL"
                        ? "border-[#007F9E] bg-[#EEF8FA] text-[#007F9E] font-semibold dark:border-[#22D3EE] dark:bg-[#0C384F] dark:text-[#22D3EE]"
                        : "border-[#D6E4EC] bg-white text-[#123B5D] hover:bg-[#F4F9FB] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#E2EEF5] dark:hover:bg-[#102B3C]"
                      }`}
                  >
                    <option value="ALL">{t("common.allRoles") || "All Roles"}</option>
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {getRoleLabel(r, t)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718899] dark:text-[#8CB0C7]"
                  />
                </div>

                {/* STATUS DROPDOWN */}
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`h-9 sm:h-10 appearance-none rounded-xl border pl-3 pr-8 text-xs sm:text-[13px] font-medium outline-none transition cursor-pointer focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:focus:border-[#22D3EE] ${status !== "ALL"
                        ? "border-[#007F9E] bg-[#EEF8FA] text-[#007F9E] font-semibold dark:border-[#22D3EE] dark:bg-[#0C384F] dark:text-[#22D3EE]"
                        : "border-[#D6E4EC] bg-white text-[#123B5D] hover:bg-[#F4F9FB] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#E2EEF5] dark:hover:bg-[#102B3C]"
                      }`}
                  >
                    <option value="ALL">{t("common.allStatuses") || "All Status"}</option>
                    <option value="Active">{t("common.active") || "Active"}</option>
                    <option value="Inactive">{t("common.inactive") || "Inactive"}</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718899] dark:text-[#8CB0C7]"
                  />
                </div>

                {/* CLEAR ACTIVE FILTERS */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setDepartment("ALL");
                      handleStatusChange("ALL");
                      setRole("ALL");
                      setPage(1);
                    }}
                    className="ml-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626] hover:text-[#B91C1C] transition cursor-pointer"
                  >
                    <X size={13} />
                    <span>{t("common.clear") || (language === "hi" ? "साफ़ करें" : "Clear Filters")}</span>
                  </button>
                )}
              </div>

              {/* SEARCH BOX (RIGHT ALIGNED) */}
              <div className="relative w-full lg:w-[280px]">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718899] dark:text-[#8CB0C7]"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t("employees.searchEmployeesPlaceholder") || "Search employees by name, email..."}
                  className="h-9 sm:h-10 w-full rounded-xl border border-[#D6E4EC] bg-white pl-9 pr-8 text-xs sm:text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded text-[#718899] hover:bg-[#EEF5F9] hover:text-[#123B5D] dark:hover:bg-[#102B3C] dark:hover:text-white transition cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* TABLE CONTAINER */}
            <div className="w-full overflow-x-auto responsive-table-scroll">
              <table className="w-full min-w-[920px] text-left border-collapse">
                <thead className="border-b border-[#E9F0F4] bg-[#FAFDFE] dark:border-[#1E435E] dark:bg-[#082030]">
                  <tr className="h-10 text-[11px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                    <th className="px-5 py-3 font-bold">{t("employees.colEmployee") || "EMPLOYEE"}</th>
                    <th className="px-4 py-3 font-bold">{t("employees.colId") || "ID"}</th>
                    <th className="px-4 py-3 font-bold">{t("employees.colDepartment") || "DEPARTMENT"}</th>
                    <th className="px-4 py-3 font-bold">{t("employees.colRole") || "ROLE"}</th>
                    <th className="px-4 py-3 font-bold">{t("tasks.tasks") || "TASKS"}</th>
                    <th className="px-4 py-3 font-bold">{t("common.completion") || "COMPLETION"}</th>
                    <th className="px-4 py-3 font-bold">{t("employees.colStatus") || "STATUS"}</th>
                    <th className="px-11 py-3 font-bold text-right">{t("employees.colActions") || "ACTIONS"}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EDF3F7] bg-white dark:divide-[#173950] dark:bg-[#0B2538]">
                  {paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D6E4EC] bg-[#EEF5F9] text-[#718899] shadow-2xs dark:border-[#1E435E] dark:bg-[#0C384F] dark:text-[#8CB0C7]">
                          <Users size={26} strokeWidth={1.8} />
                        </div>
                        <p className="mt-4 text-[15px] font-bold text-[#123B5D] dark:text-white">
                          {t("employees.noEmployeesFound") || "No employees found"}
                        </p>
                        <p className="mt-1 text-xs text-[#718899] dark:text-[#8CB0C7]">
                          {t("employees.tryAnotherFilter") || "Try changing your search keywords or filter criteria."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((employee, index) => {
                      const employeeName =
                        employee.name ||
                        `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                        "Unnamed Employee";

                      const employeeStatus = getEmployeeStatus(employee);
                      const totalTasks = Number(employee.totalTasks ?? 0);
                      const completedTasks = Number(employee.completedTasks ?? 0);
                      const completionRate =
                        employee.completionRate !== undefined
                          ? Number(employee.completionRate)
                          : totalTasks > 0
                            ? Math.round((completedTasks / totalTasks) * 100)
                            : 0;

                      const databaseId = employee._id || employee.id || `emp-${index}`;
                      const avatarTheme = getAvatarTheme(employeeName);

                      const canonicalRole = normalizeRole(employee.role);
                      const isSuper = canonicalRole === ROLES.SUPER_ADMIN;
                      const isAdmin = canonicalRole === ROLES.ADMINISTRATOR;
                      const isEmployee =
                        canonicalRole === "employee" ||
                        (canonicalRole as string) === "user" ||
                        (canonicalRole as string) === "staff";

                      const viewerRole = normalizeRole(currentRole);
                      const isSuperAdminViewer = viewerRole === ROLES.SUPER_ADMIN;
                      const isAdminViewer =
                        viewerRole === ROLES.ADMINISTRATOR ||
                        (viewerRole as string) === "admin";

                      // Edit permissions:
                      // Admin       -> Employee only
                      // Super Admin -> Administrator + Employee
                      // Super Admin -> never editable
                      const canEditEmployee =
                        !isSuper &&
                        ((isAdminViewer && isEmployee) ||
                          (isSuperAdminViewer && (isAdmin || isEmployee)));

                      // Block/unblock permissions:
                      // Self        -> cannot block own account
                      // Admin       -> Employee only
                      // Super Admin -> Administrator + Employee
                      // Super Admin -> never blockable
                      const isSelf = Boolean(currentUserId && databaseId === currentUserId);
                      const canBlockEmployee =
                        !isSelf &&
                        !isSuper &&
                        ((isAdminViewer && isEmployee) ||
                          (isSuperAdminViewer && (isAdmin || isEmployee)));

                      return (
                        <tr
                          key={databaseId}
                          onClick={() => {
                            if (canEditEmployee) handleEditEmployee(employee);
                          }}
                          className={`group h-16 border-b border-[#EDF3F7] dark:border-[#173950] last:border-b-0 transition-colors duration-150 ${canEditEmployee
                              ? "cursor-pointer hover:bg-[#F7FAFC] dark:hover:bg-[#0E2C42]/50"
                              : "cursor-default hover:bg-[#F7FAFC] dark:hover:bg-[#0E2C42]/50"
                            }`}
                        >
                          {/* EMPLOYEE NAME + EMAIL + AVATAR */}
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              {employee.profilePhoto ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={employee.profilePhoto}
                                  alt={employeeName}
                                  className="h-9 w-9 rounded-xl object-cover shrink-0 border border-[#D6E4EC] dark:border-[#1E435E]"
                                />
                              ) : (
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs border border-[#D6E4EC] dark:border-[#1E435E] ${avatarTheme.bg} ${avatarTheme.text}`}
                                >
                                  {getInitials(employee)}
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13.5px] font-bold text-[#123B5D] group-hover:text-[#007F9E] dark:text-white dark:group-hover:text-[#22D3EE] transition-colors leading-tight">
                                  {employeeName}
                                </p>
                                <p className="truncate text-[11.5px] font-medium text-[#718899] dark:text-[#8CB0C7] mt-0.5 leading-tight">
                                  {employee.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* EMPLOYEE ID */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-[#123B5D] dark:text-[#E2EEF5] tabular-nums">
                              {employee.employeeId || "—"}
                            </span>
                          </td>

                          {/* DEPARTMENT */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-[#47667B] dark:text-[#9FB7C6]">
                              {employee.department || "—"}
                            </span>
                          </td>

                          {/* ROLE */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex h-[24px] items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold leading-none shadow-2xs whitespace-nowrap ${isSuper
                                  ? "border-[#FDE3B5] bg-[#FFF8EB] text-[#D97706] dark:border-[#634310] dark:bg-[#3D2808] dark:text-[#FBBF24]"
                                  : isAdmin
                                    ? "border-[#BEEBD6] bg-[#E6F8F1] text-[#00A878] dark:border-[#125841] dark:bg-[#093527] dark:text-[#34D399]"
                                    : "border-[#CFE5FF] bg-[#EBF5FF] text-[#087FE8] dark:border-[#1A456E] dark:bg-[#0D2E4D] dark:text-[#38BDF8]"
                                }`}
                            >
                              {isSuper && <Crown size={11} className="shrink-0 text-[#D97706] dark:text-[#FBBF24]" />}
                              {getRoleLabel(employee.role, t)}
                            </span>
                          </td>

                          {/* TASKS */}
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold text-[#123B5D] dark:text-white tabular-nums">
                              {totalTasks}
                            </span>
                          </td>

                          {/* COMPLETION */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-16 sm:w-20 overflow-hidden rounded-full bg-[#E5EEF3] dark:bg-[#122B3B]">
                                <div
                                  className="h-full rounded-full bg-[#00A878] transition-all duration-300"
                                  style={{
                                    width: `${Math.min(Math.max(completionRate, 0), 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-[#123B5D] dark:text-white tabular-nums">
                                {completionRate}%
                              </span>
                            </div>
                          </td>

                          {/* STATUS */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex h-[24px] items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-semibold leading-none shadow-2xs whitespace-nowrap ${employeeStatus === "Active"
                                  ? "border-[#BEEBD6] bg-[#E6F8F1] text-[#00A878] dark:border-[#125841] dark:bg-[#093527] dark:text-[#34D399]"
                                  : "border-[#D9E4EC] bg-[#EEF4F8] text-[#718899] dark:border-[#1E435E] dark:bg-[#122B3B] dark:text-[#8CB0C7]"
                                }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${employeeStatus === "Active"
                                    ? "bg-[#00A878] dark:bg-[#34D399]"
                                    : "bg-[#718899] dark:bg-[#8CB0C7]"
                                  }`}
                              />
                              {employeeStatus === "Active" ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td
                            onClick={(e) => e.stopPropagation()}
                            className="px-6 py-3 text-right cursor-default"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {/* VIEW - Admin and Super Admin can view all */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEmployee(employee);
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6E4EC] bg-white text-[#527186] hover:border-[#007F9E] hover:text-[#007F9E] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:border-[#22D3EE] dark:hover:text-[#22D3EE] dark:hover:bg-[#0C384F] transition-all shadow-2xs cursor-pointer"
                                title={t("common.view") || "View Details"}
                                aria-label={t("common.view") || "View Details"}
                              >
                                <Eye size={14} />
                              </button>

                              {/* EDIT - role based permission */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canEditEmployee) handleEditEmployee(employee);
                                }}
                                disabled={!canEditEmployee}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all shadow-2xs ${!canEditEmployee
                                    ? "cursor-not-allowed border-[#D6E4EC] bg-[#F4F9FB] text-[#8A9BA8] opacity-40 dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#527186]"
                                    : "cursor-pointer border-[#D6E4EC] bg-white text-[#D97706] hover:border-[#FDE3B5] hover:bg-[#FFF8EB] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#FBBF24] dark:hover:bg-[#3D2808]"
                                  }`}
                                title={
                                  canEditEmployee
                                    ? t("common.edit") || "Edit Employee"
                                    : isSuper
                                      ? "Super Administrator cannot be modified"
                                      : "You do not have permission to edit this employee"
                                }
                                aria-label={t("common.edit") || "Edit Employee"}
                              >
                                <Pencil size={14} />
                              </button>

                              {/* BLOCK / UNBLOCK */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (canBlockEmployee) setBlockConfirmEmployee(employee);
                                }}
                                disabled={!canBlockEmployee}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all shadow-2xs ${!canBlockEmployee
                                    ? "cursor-not-allowed border-[#D6E4EC] bg-[#F4F9FB] text-[#8A9BA8] opacity-40 dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#527186]"
                                    : employee.isBlocked
                                      ? "cursor-pointer border-[#BEEBD6] bg-[#E6F8F1] text-[#00A878] hover:bg-[#D1FAE5] dark:border-[#125841] dark:bg-[#093527] dark:text-[#34D399]"
                                      : "cursor-pointer border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171]"
                                  }`}
                                title={
                                  canBlockEmployee
                                    ? employee.isBlocked
                                      ? (t("employees.unblock") || "Unblock Employee")
                                      : (t("employees.block") || "Block Employee")
                                    : isSelf
                                      ? (language === "hi" ? "आप अपने खाते को ब्लॉक नहीं कर सकते" : "You cannot block your own account")
                                      : isSuper
                                        ? (language === "hi" ? "सुपर व्यवस्थापक को ब्लॉक नहीं किया जा सकता" : "Super Admin cannot be blocked")
                                        : (language === "hi" ? "आपके पास इस खाते को ब्लॉक करने की अनुमति नहीं है" : "You do not have permission to block this account")
                                }
                                aria-label={
                                  canBlockEmployee
                                    ? employee.isBlocked
                                      ? (t("employees.unblock") || "Unblock Employee")
                                      : (t("employees.block") || "Block Employee")
                                    : isSelf
                                      ? (language === "hi" ? "आप अपने खाते को ब्लॉक नहीं कर सकते" : "You cannot block your own account")
                                      : isSuper
                                        ? (language === "hi" ? "सुपर व्यवस्थापक को ब्लॉक नहीं किया जा सकता" : "Super Admin cannot be blocked")
                                        : (language === "hi" ? "अनुमति नहीं है" : "You do not have permission to block this account")
                                }
                              >
                                {employee.isBlocked ? (
                                  <UserCheck size={14} />
                                ) : (
                                  <Ban size={14} />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER / PAGINATION */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#E9F0F4] bg-[#FAFDFE] px-4 sm:px-5 py-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
              <p className="text-xs text-[#718899] dark:text-[#8CB0C7]">
                {language === "hi" ? (
                  <>
                    दिखाया जा रहा है{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {filteredEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                    </span>{" "}
                    –{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {Math.min(safePage * pageSize, filteredEmployees.length)}
                    </span>{" "}
                    कुल{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {filteredEmployees.length}
                    </span>{" "}
                    कर्मचारी
                  </>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {filteredEmployees.length === 0 ? 0 : (safePage - 1) * pageSize + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {Math.min(safePage * pageSize, filteredEmployees.length)}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-[#123B5D] dark:text-white tabular-nums">
                      {filteredEmployees.length}
                    </span>{" "}
                    results
                  </>
                )}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage === 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6E4EC] bg-white text-[#47718D] transition hover:bg-[#EEF5F9] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E] cursor-pointer"
                    aria-label={t("common.previous") || "Previous Page"}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold leading-none transition cursor-pointer ${safePage === pageNum
                          ? "bg-[#007F9E] text-white shadow-2xs dark:bg-[#007F9E]"
                          : "border border-[#D6E4EC] bg-white text-[#123B5D] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E]"
                        }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {safePage > 5 && safePage < totalPages && (
                    <>
                      <span className="px-1 text-xs text-[#718899] dark:text-[#8CB0C7]">…</span>
                      <button
                        type="button"
                        className="flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold leading-none bg-[#007F9E] text-white shadow-2xs dark:bg-[#007F9E]"
                      >
                        {safePage}
                      </button>
                    </>
                  )}

                  {totalPages > 5 && (
                    <>
                      <span className="px-1 text-xs text-[#718899] dark:text-[#8CB0C7]">…</span>
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        className={`flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2 text-xs font-semibold leading-none transition cursor-pointer ${safePage === totalPages
                            ? "bg-[#007F9E] text-white shadow-2xs dark:bg-[#007F9E]"
                            : "border border-[#D6E4EC] bg-white text-[#123B5D] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E]"
                          }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={safePage === totalPages}
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D6E4EC] bg-white text-[#47718D] transition hover:bg-[#EEF5F9] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E] cursor-pointer"
                    aria-label={t("common.next") || "Next Page"}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <GoToPage
                  currentPage={safePage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#718899] dark:text-[#8CB0C7]">
                  {language === "hi" ? "प्रति पृष्ठ पंक्तियाँ" : "Rows per page"}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-[#D6E4EC] bg-white px-2.5 text-xs font-semibold text-[#123B5D] shadow-2xs outline-none transition focus:border-[#007F9E] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* =================================================
          ADD EMPLOYEE MODAL
      ================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          if (!addingEmployee) setIsAddModalOpen(false);
        }}
        className="w-full max-w-lg"
      >
        <div className="w-full overflow-hidden rounded-2xl border border-[#D6E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex items-center justify-between border-b border-[#E9F0F4] px-6 py-4 dark:border-[#1E435E]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#CFE5FF] bg-[#EBF5FF] text-[#087FE8] dark:border-[#1A456E] dark:bg-[#0D2E4D] dark:text-[#38BDF8]">
                <UserPlus size={19} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-[#123B5D] dark:text-white">
                  {t("employees.addEmployee") || "Add New Employee"}
                </h3>
                <p className="text-xs text-[#718899] dark:text-[#8CB0C7]">
                  {language === "hi" ? "अपने संगठन में एक नया कर्मचारी जोड़ने के लिए विवरण दर्ज करें।" : "Enter details to add an employee to your organization."}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={addingEmployee}
              onClick={() => setIsAddModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#718899] hover:bg-[#EEF5F9] hover:text-[#123B5D] dark:hover:bg-[#12364E] dark:hover:text-white transition cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "पहला नाम" : "First Name"} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.firstName}
                  onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  placeholder="Aarav"
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "अंतिम नाम" : "Last Name"} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.lastName}
                  onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  placeholder="Sharma"
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "ईमेल पता" : "Email Address"} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="aarav.sharma@example.com"
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "फ़ोन नंबर" : "Phone Number"}
                </label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {t("employees.department") || "Department"}
                </label>
                <select
                  value={activeAddDepartment}
                  onChange={(e) => setAddForm({ ...addForm, department: e.target.value, designation: "" })}
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white cursor-pointer"
                >
                  <option value="" disabled>{language === "hi" ? "विभाग चुनें" : "Select Department"}</option>
                  {masterDeptNames.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {t("employees.designation") || "Designation"}
                </label>
                <select
                  value={addForm.designation}
                  onChange={(e) => setAddForm({ ...addForm, designation: e.target.value })}
                  disabled={!activeAddDepartment && addFormDesigNames.length === 0}
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white disabled:opacity-50 cursor-pointer"
                >
                  <option value="">{language === "hi" ? "पद चुनें" : "Select Designation"}</option>
                  {addFormDesigNames.map((desig) => (
                    <option key={desig} value={desig}>
                      {desig}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "भूमिका स्तर" : "Role Level"}
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white cursor-pointer"
                >
                  <option value="employee">{getRoleLabel("employee", t)}</option>
                  <option value="administrator">{getRoleLabel("administrator", t)}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7] mb-1.5">
                  {language === "hi" ? "प्रारंभिक पासवर्ड" : "Initial Password"} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder={language === "hi" ? "न्यूनतम 8 वर्ण" : "Min. 8 characters"}
                  className="h-10 w-full rounded-xl border border-[#D6E4EC] bg-white px-3.5 text-[13px] font-medium text-[#123B5D] placeholder:text-[#8A9BA8] outline-none transition focus:border-[#007F9E] focus:ring-2 focus:ring-[#007F9E]/10 dark:border-[#1E435E] dark:bg-[#082030] dark:text-white dark:placeholder:text-[#648498]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E9F0F4] dark:border-[#1E435E]">
              <button
                type="button"
                disabled={addingEmployee}
                onClick={() => setIsAddModalOpen(false)}
                className="h-10 rounded-xl border border-[#D6E4EC] bg-white px-4 text-xs font-semibold text-[#527186] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E] transition cursor-pointer"
              >
                {t("common.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                disabled={addingEmployee}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#007F9E] px-5 text-xs font-semibold text-white shadow-2xs hover:bg-[#006E8A] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {addingEmployee ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>{language === "hi" ? "बनाया जा रहा है..." : "Creating..."}</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>{language === "hi" ? "खाता बनाएं" : "Create Account"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =================================================
          BLOCK / UNBLOCK CONFIRMATION MODAL
      ================================================= */}
      <Modal
        isOpen={!!blockConfirmEmployee}
        onClose={() => {
          if (!blockingEmployeeId) setBlockConfirmEmployee(null);
        }}
        className="w-full max-w-md"
      >
        {blockConfirmEmployee && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#D6E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${blockConfirmEmployee.isBlocked
                      ? "border-[#BEEBD6] bg-[#E6F8F1] text-[#00A878] dark:border-[#125841] dark:bg-[#093527] dark:text-[#34D399]"
                      : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171]"
                    }`}
                >
                  {blockConfirmEmployee.isBlocked ? <UserCheck size={22} /> : <Ban size={22} />}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-[#123B5D] dark:text-white">
                    {blockConfirmEmployee.isBlocked
                      ? (blockConfirmEmployee.role === "admin" || blockConfirmEmployee.role === "administrator"
                        ? (language === "hi" ? "व्यवस्थापक अनब्लॉक करें?" : "Unblock Administrator?")
                        : (language === "hi" ? "कर्मचारी अनब्लॉक करें?" : "Unblock Employee?"))
                      : (blockConfirmEmployee.role === "admin" || blockConfirmEmployee.role === "administrator"
                        ? (language === "hi" ? "व्यवस्थापक ब्लॉक करें?" : "Block Administrator?")
                        : (language === "hi" ? "कर्मचारी ब्लॉक करें?" : "Block Employee?"))}
                  </h3>
                  <p className="mt-1 text-xs text-[#718899] dark:text-[#8CB0C7] leading-relaxed">
                    {blockConfirmEmployee.isBlocked
                      ? (blockConfirmEmployee.role === "admin" || blockConfirmEmployee.role === "administrator"
                        ? (language === "hi" ? "इस व्यवस्थापक को अपने खाते और प्रशासनिक कार्यों तक सक्रिय पहुँच पुनः प्राप्त होगी।" : "This administrator will regain active access to their account and administrative functions.")
                        : (language === "hi" ? "इस कर्मचारी को अपने खाते और संगठन के कार्यों तक सक्रिय पहुँच पुनः प्राप्त होगी।" : "This employee will regain active access to their account and workspace."))
                      : (blockConfirmEmployee.role === "admin" || blockConfirmEmployee.role === "administrator"
                        ? (language === "hi" ? "इस व्यवस्थापक को लॉगिन करने और प्रशासनिक कार्यों तक पहुँचने से रोका जाएगा।" : "This administrator will be prevented from logging in and accessing administrative functions.")
                        : (language === "hi" ? "इस कर्मचारी को लॉगिन करने और संगठनात्मक कार्यों तक पहुँचने से रोका जाएगा।" : "This employee will be prevented from logging in and accessing organization tasks."))}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[13.5px] font-bold text-[#123B5D] dark:text-white">
                  {blockConfirmEmployee.name ||
                    `${blockConfirmEmployee.firstName || ""} ${blockConfirmEmployee.lastName || ""}`.trim() ||
                    "Employee"}
                </p>
                <p className="mt-0.5 text-xs text-[#718899] dark:text-[#8CB0C7]">
                  ID: {blockConfirmEmployee.employeeId || "—"} · {blockConfirmEmployee.email || "No email"}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={!!blockingEmployeeId}
                  onClick={() => setBlockConfirmEmployee(null)}
                  className="h-10 rounded-xl border border-[#D6E4EC] bg-white px-4 text-xs font-semibold text-[#527186] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E] transition cursor-pointer"
                >
                  {t("common.cancel") || "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={!!blockingEmployeeId}
                  onClick={() => handleToggleBlock(blockConfirmEmployee)}
                  className={`inline-flex h-10 items-center gap-2 rounded-xl px-4.5 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 cursor-pointer ${blockConfirmEmployee.isBlocked
                      ? "bg-[#00A878] hover:bg-[#009166]"
                      : "bg-[#DC2626] hover:bg-[#B91C1C]"
                    }`}
                >
                  {blockingEmployeeId ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{language === "hi" ? "अपडेट हो रहा है..." : "Updating..."}</span>
                    </>
                  ) : blockConfirmEmployee.isBlocked ? (
                    language === "hi" ? "अनब्लॉक की पुष्टि करें" : "Confirm Unblock"
                  ) : (
                    language === "hi" ? "ब्लॉक की पुष्टि करें" : "Confirm Block"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* =================================================
          EMPLOYEE DETAILS MODAL
      ================================================= */}
      <Modal
        isOpen={!!selectedEmployee}
        onClose={closeEmployeeModal}
        className="w-full max-w-lg"
      >
        {selectedEmployee && (
          <div
            className={`w-full overflow-hidden rounded-2xl border border-[#D6E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538] motion-reduce:animate-none ${isEmployeeModalClosing
                ? "motion-safe:animate-[employeeModalOut_170ms_cubic-bezier(0.22,1,0.36,1)_both]"
                : "motion-safe:animate-[employeeModalIn_200ms_cubic-bezier(0.22,1,0.36,1)_both]"
              }`}
          >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-[#E9F0F4] px-6 py-4 dark:border-[#1E435E]">
              <div className="flex items-center gap-3">
                {selectedEmployee.profilePhoto ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedEmployee.profilePhoto}
                    alt={selectedEmployee.name || "Employee"}
                    className="h-11 w-11 rounded-xl object-cover border border-[#D6E4EC] dark:border-[#1E435E]"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#CFE5FF] bg-[#EBF5FF] text-xs font-bold text-[#087FE8] dark:border-[#1A456E] dark:bg-[#0D2E4D] dark:text-[#38BDF8]">
                    {getInitials(selectedEmployee)}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-[#123B5D] dark:text-white">
                    {selectedEmployee.name ||
                      `${selectedEmployee.firstName || ""} ${selectedEmployee.lastName || ""}`.trim() ||
                      "Employee"}
                  </h3>
                  <p className="text-xs text-[#718899] dark:text-[#8CB0C7]">
                    {selectedEmployee.email || "No email"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeEmployeeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#718899] hover:bg-[#EEF5F9] hover:text-[#123B5D] dark:hover:bg-[#12364E] dark:hover:text-white transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="p-6 grid grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.employeeId") || "Employee ID"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#123B5D] dark:text-white tabular-nums">
                  {selectedEmployee.employeeId || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.department") || "Department"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#123B5D] dark:text-white">
                  {selectedEmployee.department || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.designation") || "Designation"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#123B5D] dark:text-white">
                  {selectedEmployee.designation || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.role") || "Role"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#123B5D] dark:text-white">
                  {getRoleLabel(selectedEmployee.role, t)}
                </p>
              </div>

              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.totalTasks") || "Total Tasks"}
                </p>
                <p className="mt-1 text-xs font-bold text-[#123B5D] dark:text-white tabular-nums">
                  {selectedEmployee.totalTasks ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-[#D6E4EC] bg-[#F4F9FB] p-3.5 dark:border-[#1E435E] dark:bg-[#082030]">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#718899] dark:text-[#8CB0C7]">
                  {t("employees.status") || "Status"}
                </p>
                <p
                  className={`mt-1 text-xs font-bold ${getEmployeeStatus(selectedEmployee) === "Active"
                      ? "text-[#00A878] dark:text-[#34D399]"
                      : "text-[#DC2626] dark:text-[#F87171]"
                    }`}
                >
                  {getEmployeeStatus(selectedEmployee) === "Active" ? (t("common.active") || "Active") : (t("common.inactive") || "Inactive")}
                </p>
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="flex items-center justify-between border-t border-[#E9F0F4] px-6 py-4 bg-[#FAFDFE] dark:border-[#1E435E] dark:bg-[#082030]">
              <button
                type="button"
                onClick={() => {
                  closeEmployeeModal();
                  window.setTimeout(() => handleEditEmployee(selectedEmployee), 170);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#007F9E] px-4.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#006E8A] transition-colors cursor-pointer"
              >
                <Pencil size={14} />
                <span>{language === "hi" ? "पूर्ण प्रोफ़ाइल संपादित करें" : "Edit Full Profile"}</span>
              </button>

              <button
                type="button"
                onClick={closeEmployeeModal}
                className="h-10 rounded-xl border border-[#D6E4EC] bg-white px-4 text-xs font-semibold text-[#527186] hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#12364E] transition cursor-pointer"
              >
                {t("common.close") || "Close"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        @keyframes employeeModalIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes employeeModalOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(6px) scale(0.985);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes employeeModalIn {
            from,
            to {
              opacity: 1;
              transform: none;
            }
          }

          @keyframes employeeModalOut {
            from,
            to {
              opacity: 0;
              transform: none;
            }
          }
        }
      `}</style>
    </main>
  );
}

export default function AdminEmployeesPage() {
  return (
    <Suspense fallback={null}>
      <AdminEmployeesContent />
    </Suspense>
  );
}
