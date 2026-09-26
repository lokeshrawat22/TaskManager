"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  Crown,
  GraduationCap,
  Lock,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { invalidateMasterData } from "@/service/masterData.service";
import {
  ROLES,
  ROLE_LABELS,
  getRoleLabel,
  normalizeRole,
} from "@/constants/rbac";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

// =====================================================
// TYPES
// =====================================================

interface Employee {
  _id: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  email: string;
  country?: string;
  countryCode?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  qualification?: string;
  department?: string;
  designation?: string;
  role: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isBlocked?: boolean;
  profilePhoto?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface EmployeeResponse {
  success: boolean;
  message: string;
  data: {
    employee: Employee;
  };
}

// =====================================================
// MAIN EMPLOYEE DETAILS PAGE
// =====================================================

export default function EmployeeDetailsPage() {
  const { t, language } = useLanguage();
  const params = useParams();
  const router = useRouter();

  const id = params?.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: "",
    department: "",
    designation: "",
    role: "employee",
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  const { departmentNames: activeDeptNames } = useDepartments({ status: "ACTIVE" });
  const { designationNames: activeDesigNames } = useDesignations({
    department: formData.department,
    status: "ACTIVE",
  });
  const [roleChangeModalOpen, setRoleChangeModalOpen] = useState(false);

  const [employeeIdError, setEmployeeIdError] = useState("");
  const [isCheckingId, setIsCheckingId] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { currentUser } = useAuth();

  // 1. Consume current user profile from AuthContext to determine Super Admin authorization
  useEffect(() => {
    if (currentUser?.role) {
      setCurrentUserRole(currentUser.role);
      setIsSuperAdmin(normalizeRole(currentUser.role) === ROLES.SUPER_ADMIN);
    }
  }, [currentUser]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 2. Fetch Employee and Tasks
  const fetchEmployee = async () => {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        throw new Error("Employee ID is missing");
      }

      const response = await apiRequest<EmployeeResponse>(
        `/api/users/employees/${encodeURIComponent(id)}`,
        {
          method: "GET",
        },
      );

      if (!response?.success || !response?.data?.employee) {
        throw new Error(response?.message || "Employee data not found");
      }

      const employeeData = response.data.employee;

      setEmployee(employeeData);
      setFormData({
        employeeId: employeeData.employeeId || "",
        department: employeeData.department || "",
        designation: employeeData.designation || "",
        role: normalizeRole(employeeData.role),
      });
      setEmployeeIdError("");
    } catch (err: any) {
      console.error("[ADMIN EMPLOYEE] Fetch error:", err);
      setError(err?.message || "Unable to load employee details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  // Form Validation & ID Duplicate Check
  const isCurrentEmployeeId = (val: string) => {
    if (!employee?.employeeId) return false;
    return val.trim().toUpperCase() === employee.employeeId.trim().toUpperCase();
  };

  const validateEmployeeIdFormat = (val: string): string => {
    const trimmed = val.trim();
    if (!trimmed) {
      return t("employeeIdIsRequired") || "Employee ID is required";
    }
    if (!/^MM\d{3,}$/i.test(trimmed)) {
      return t("employeeIdMustBe") || "Employee ID must be like MM001";
    }
    return "";
  };

  const checkDuplicateEmployeeId = async (val: string): Promise<string> => {
    const trimmed = val.trim();
    const formatErr = validateEmployeeIdFormat(trimmed);
    if (formatErr) return formatErr;

    if (isCurrentEmployeeId(trimmed)) {
      return "";
    }

    try {
      setIsCheckingId(true);
      const res = await apiRequest<{
        success: boolean;
        available: boolean;
        message: string;
      }>(
        `/api/users/check-employee-id?employeeId=${encodeURIComponent(
          trimmed,
        )}&excludeId=${encodeURIComponent(employee?._id || "")}`,
        { method: "GET" },
      );

      if (res && res.available === false) {
        return (
          t("employeeIdAlreadyAssigned") ||
          "This Employee ID is already assigned."
        );
      }
      return "";
    } catch (err: any) {
      console.error("[ADMIN EMPLOYEE] Check employee ID error:", err);
      if (err?.status === 409 || err?.message?.includes("already assigned")) {
        return (
          t("employeeIdAlreadyAssigned") ||
          "This Employee ID is already assigned."
        );
      }
      return "";
    } finally {
      setIsCheckingId(false);
    }
  };

  const handleEmployeeIdChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      employeeId: value,
    }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      setEmployeeIdError(t("employeeIdIsRequired") || "Employee ID is required");
      return;
    }

    if (!/^MM\d{3,}$/i.test(trimmed)) {
      setEmployeeIdError(t("employeeIdMustBe") || "Employee ID must be like MM001");
      return;
    }

    if (isCurrentEmployeeId(trimmed)) {
      setEmployeeIdError("");
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      const err = await checkDuplicateEmployeeId(trimmed);
      setEmployeeIdError(err);
    }, 350);
  };

  const handleEmployeeIdBlur = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const trimmed = formData.employeeId.trim();
    if (!trimmed) {
      setEmployeeIdError(t("employeeIdIsRequired") || "Employee ID is required");
      return;
    }
    if (!/^MM\d{3,}$/i.test(trimmed)) {
      setEmployeeIdError(t("employeeIdMustBe") || "Employee ID must be like MM001");
      return;
    }
    if (isCurrentEmployeeId(trimmed)) {
      setEmployeeIdError("");
      return;
    }
    const err = await checkDuplicateEmployeeId(trimmed);
    setEmployeeIdError(err);
  };

  const handleDepartmentChange = (newDept: string) => {
    setFormData((prev) => ({
      ...prev,
      department: newDept,
      designation: "",
    }));
  };

  const handleChange = (
    field: "employeeId" | "department" | "designation" | "role",
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const displayedDepartments = useMemo(() => {
    const list = [...activeDeptNames];
    if (employee?.department && !list.includes(employee.department)) {
      list.unshift(employee.department);
    }
    if (formData.department && !list.includes(formData.department)) {
      list.unshift(formData.department);
    }
    return Array.from(new Set(list));
  }, [activeDeptNames, employee?.department, formData.department]);

  const availableDesignations = useMemo(() => {
    if (!formData.department) return [];
    const list = [...activeDesigNames];
    if (employee?.designation && formData.department === employee.department && !list.includes(employee.designation)) {
      list.unshift(employee.designation);
    }
    if (formData.designation && !list.includes(formData.designation)) {
      list.unshift(formData.designation);
    }
    return Array.from(new Set(list));
  }, [activeDesigNames, employee?.designation, employee?.department, formData.department, formData.designation]);

  const executeSave = async (overrideRole?: string) => {
    try {
      if (!employee?._id) {
        throw new Error("Employee database ID is missing");
      }

      const trimmedEmpId = formData.employeeId.trim();
      setSaving(true);
      setError("");

      const updatePayload: Record<string, any> = {
        employeeId: trimmedEmpId.toUpperCase(),
        department: formData.department.trim(),
        designation: formData.designation.trim(),
      };

      const response = await apiRequest<EmployeeResponse>(
        `/api/users/${encodeURIComponent(employee._id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        },
      );

      if (!response?.success) {
        throw new Error(response?.message || "Employee update failed");
      }

      if (response.data?.employee) {
        const updated = response.data.employee;
        const finalRole = overrideRole || updated.role || employee.role;
        setEmployee((prev) => ({
          ...prev!,
          ...updated,
          role: finalRole,
        }));

        setFormData({
          employeeId: updated.employeeId || "",
          department: updated.department || "",
          designation: updated.designation || "",
          role: normalizeRole(finalRole),
        });

        invalidateMasterData("all");
      }

      setEmployeeIdError("");
      const successMsg = response?.message || t("success") || "Employee updated successfully.";
      showToast.success(successMsg);
      setRoleChangeModalOpen(false);
      setIsEditing(false);
    } catch (err: any) {
      console.error("[ADMIN EMPLOYEE] Update error:", err);
      const errorMsg = err?.message || "Unable to update employee.";
      if (err?.status === 403 || errorMsg.includes("not authorized")) {
        const authMsg = err?.message || "You are not authorized to perform this update.";
        showToast.error(authMsg);
        setError(authMsg);
      } else if (err?.status === 409 || errorMsg.includes("already assigned")) {
        const duplicateMsg =
          t("employeeIdAlreadyAssigned") ||
          "This Employee ID is already assigned.";
        setEmployeeIdError(duplicateMsg);
        showToast.error(duplicateMsg);
      } else {
        showToast.error(errorMsg);
        setError(errorMsg);
      }
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    try {
      if (!employee?._id) {
        throw new Error("Employee database ID is missing");
      }

      setSaving(true);
      setError("");

      // 1. Call dedicated role change endpoint with ONLY { role }
      const response = await apiRequest<EmployeeResponse>(
        `/api/users/${encodeURIComponent(employee._id)}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: formData.role }),
        },
      );

      if (!response?.success) {
        throw new Error(response?.message || "Role update failed");
      }

      const updated = response.data?.employee;
      const newRole = updated?.role || formData.role;

      // Update employee state immediately
      setEmployee((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          role: newRole,
        };
      });

      setFormData((prev) => ({
        ...prev,
        role: normalizeRole(newRole),
      }));

      // 2. Check if other profile fields were also modified in the same form session
      const trimmedEmpId = formData.employeeId.trim().toUpperCase();
      const isIdChanged = trimmedEmpId !== (employee.employeeId || "").toUpperCase();
      const isDeptChanged = formData.department.trim().toLowerCase() !== (employee.department || "").toLowerCase();
      const isDesigChanged = formData.designation.trim().toLowerCase() !== (employee.designation || "").toLowerCase();

      if (isIdChanged || isDeptChanged || isDesigChanged) {
        // If other profile fields were modified, save those fields via the profile endpoint
        await executeSave(newRole);
      } else {
        showToast.success("Account role updated successfully.");
        setRoleChangeModalOpen(false);
        setIsEditing(false);
      }
    } catch (err: any) {
      console.error("[ADMIN EMPLOYEE] Role update error:", err);
      const errorMsg = err?.message || "Unable to update role.";
      if (err?.status === 403 || errorMsg.includes("not authorized")) {
        const authMsg = err?.message || "You are not authorized to change this role.";
        showToast.error(authMsg);
        setError(authMsg);
      } else {
        showToast.error(errorMsg);
        setError(errorMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!employee?._id) {
        throw new Error("Employee database ID is missing");
      }

      const trimmedEmpId = formData.employeeId.trim();

      if (!trimmedEmpId) {
        const msg = t("employeeIdIsRequired") || "Employee ID is required";
        setEmployeeIdError(msg);
        showToast.warning(msg);
        return;
      }

      if (!/^MM\d{3,}$/i.test(trimmedEmpId)) {
        const msg = t("employeeIdMustBe") || "Employee ID must be like MM001";
        setEmployeeIdError(msg);
        showToast.warning(msg);
        return;
      }

      if (!formData.department.trim()) {
        const msg = t("departmentIsRequired") || "Department is required";
        showToast.warning(msg);
        return;
      }

      if (!formData.designation.trim()) {
        const msg = t("designationIsRequired") || "Designation is required";
        showToast.warning(msg);
        return;
      }

      if (employeeIdError) {
        showToast.error(employeeIdError);
        return;
      }

      if (!isCurrentEmployeeId(trimmedEmpId)) {
        const checkErr = await checkDuplicateEmployeeId(trimmedEmpId);
        if (checkErr) {
          setEmployeeIdError(checkErr);
          showToast.error(checkErr);
          return;
        }
      }

      const isRoleChanged =
        isSuperAdmin &&
        formData.role &&
        normalizeRole(formData.role) !== normalizeRole(employee.role);

      if (isRoleChanged) {
        setRoleChangeModalOpen(true);
        return;
      }

      await executeSave();
    } catch (err: any) {
      console.error("[ADMIN EMPLOYEE] Validation error:", err);
      showToast.error(err?.message || "Validation failed");
    }
  };

  const handleCancel = () => {
    if (!employee) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setFormData({
      employeeId: employee.employeeId || "",
      department: employee.department || "",
      designation: employee.designation || "",
      role: normalizeRole(employee.role),
    });

    setEmployeeIdError("");
    setError("");
    setRoleChangeModalOpen(false);
    setIsEditing(false);
  };

  const isSaveDisabled =
    saving ||
    isCheckingId ||
    !!employeeIdError ||
    !formData.employeeId.trim() ||
    !formData.department.trim() ||
    !formData.designation.trim() ||
    !formData.role;

  // Loading Screen
  if (loading) {
    return (
      <main className="min-h-screen w-full bg-[#F5F9FC] p-4 text-[#07365A] dark:bg-[#071F2C] dark:text-white sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-[1240px] animate-pulse space-y-6">
          <div className="h-6 w-32 rounded-lg bg-[#E1E9EF] dark:bg-[#1E435E]" />
          <div className="h-36 w-full rounded-2xl bg-[#E1E9EF] dark:bg-[#1E435E]" />
          <div className="h-44 w-full rounded-2xl bg-[#E1E9EF] dark:bg-[#1E435E]" />
          <div className="h-64 w-full rounded-2xl bg-[#E1E9EF] dark:bg-[#1E435E]" />
        </div>
      </main>
    );
  }

  // Error Screen
  if (error && !employee) {
    return (
      <main className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-[#F5F9FC] p-6 dark:bg-[#071F2C]">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-lg dark:border-rose-900/50 dark:bg-[#0B2538]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertCircle size={28} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-[#07365A] dark:text-white">
            {t("unableToLoadEmployee") || "Unable to load employee profile"}
          </h2>

          <p className="mt-2 text-xs leading-5 text-[#66829A] dark:text-[#8CB0C7]">
            {error}
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.push("/admin/employees")}
              className="rounded-xl border border-[#D8E4EC] bg-white px-5 py-2.5 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
            >
              {t("back") || "Go Back"}
            </button>

            <button
              onClick={fetchEmployee}
              className="inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-5 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
            >
              <RefreshCw size={14} />
              <span>{t("tryAgain") || "Retry"}</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!employee) return null;

  const fullName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
    "Employee";
  const initials =
    `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase() ||
    "EM";

  const formatDate = (date?: string) => {
    if (!date) return language === "hi" ? "उपलब्ध नहीं" : "Not provided";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return language === "hi" ? "उपलब्ध नहीं" : "Not provided";
    return parsed.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <main className="min-h-screen w-full bg-[#F5F9FC] text-[#07365A] dark:bg-[#071F2C] dark:text-white">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-6">
        {/* =================================================
            1. TOP SECONDARY NAVIGATION
        ================================================= */}
        <div className="w-full">
          <button
            type="button"
            onClick={() => router.push("/admin/employees")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879D9] hover:underline dark:text-[#00C2E8]"
          >
            <ArrowLeft size={14} />
            <span>{t("employees.backToEmployees") || (language === "hi" ? "कर्मचारियों पर वापस जाएं" : "Back to Employees")}</span>
          </button>
        </div>

        {/* =================================================
            2. EMPLOYEE HERO BANNER (130–150px)
        ================================================= */}
        <section className="relative w-full overflow-hidden rounded-2xl border border-[#C7D5DC] bg-gradient-to-r from-[#063B61] via-[#054875] to-[#00A6C7] p-6 text-white shadow-xs dark:border-[#1E435E] sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex w-full flex-col justify-between gap-5 md:flex-row md:items-center">
            {/* Identity Breakdown */}
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              {employee.profilePhoto ? (
                <img
                  src={employee.profilePhoto}
                  alt={fullName}
                  className="h-[72px] w-[72px] shrink-0 rounded-2xl border border-white/30 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/15 text-2xl font-bold text-white shadow-sm backdrop-blur-md">
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#7DE3EE] dark:text-[#67E8F9]">
                    {language === "hi" ? "कर्मचारी प्रोफ़ाइल" : "EMPLOYEE PROFILE"}
                  </span>
                  {!employee.isBlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {t("common.active") || "Active"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-400/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                      {language === "hi" ? "ब्लॉक किया गया" : "Blocked"}
                    </span>
                  )}
                </div>

                <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-white sm:text-[28px]">
                  {fullName}
                </h1>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/85">
                  <span className="font-medium text-white">
                    {employee.designation || (language === "hi" ? "पद सेट नहीं है" : "Designation Not Set")}
                  </span>
                  <span className="text-white/50">•</span>
                  <span>{employee.department || (language === "hi" ? "कोई विभाग नहीं" : "No Department")}</span>
                  <span className="text-white/50">•</span>
                  <span className="font-mono text-[11px] text-white/75">
                    {t("employees.employeeId") || "Employee ID"}: {employee.employeeId || "MM—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-[#063B61] shadow-xs transition hover:bg-[#F8FBFC] hover:shadow-sm"
                >
                  <Pencil size={14} />
                  <span>{t("employees.editEmployee") || (language === "hi" ? "कर्मचारी संपादित करें" : "Edit Employee")}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 disabled:opacity-50"
                  >
                    <X size={14} />
                    <span>{t("common.cancel") || "Cancel"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isSaveDisabled}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-5 text-xs font-bold text-[#063B61] shadow-xs transition hover:bg-[#F8FBFC] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{saving ? (language === "hi" ? "सहेजा जा रहा है..." : "Saving...") : (t("common.save") || "Save Changes")}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            3. ORGANIZATION DETAILS (COMPACT 4-COL GRID)
        ================================================= */}
        <section className="w-full rounded-2xl border border-[#D8E4EC] bg-white p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] sm:p-6">
          <div className="mb-4 w-full">
            <h2 className="text-base font-bold text-[#07365A] dark:text-white">
              {language === "hi" ? "संगठन विवरण" : "Organization Details"}
            </h2>
            <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "आंतरिक कार्यबल असाइनमेंट, संगठनात्मक पदानुक्रम और एक्सेस भूमिका प्रबंधित करें।" : "Manage internal workforce assignment, organizational hierarchy, and access role."}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Field 1: EMPLOYEE ID */}
            <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-[#F8FAFC] p-3.5 dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("employees.employeeId") || "EMPLOYEE ID"}
                </label>
                <BadgeCheck size={14} className="text-[#0879D9] dark:text-[#00C2E8]" />
              </div>

              {isEditing ? (
                <div className="mt-1.5 w-full min-w-0">
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleEmployeeIdChange(e.target.value)}
                    onBlur={handleEmployeeIdBlur}
                    placeholder="MM102"
                    className={`h-9 w-full min-w-0 rounded-lg border px-3 font-mono text-xs font-bold uppercase outline-none transition ${
                      employeeIdError
                        ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                        : "border-[#D8E4EC] bg-white text-[#07365A] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
                    }`}
                  />
                  {employeeIdError && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                      {employeeIdError}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1 truncate font-mono text-sm font-bold text-[#07365A] dark:text-white">
                  {employee.employeeId || (language === "hi" ? "असाइन नहीं किया गया" : "Not Assigned")}
                </p>
              )}
            </div>

            {/* Field 2: DEPARTMENT */}
            <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-[#F8FAFC] p-3.5 dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("employees.department") || "DEPARTMENT"}
                </label>
                <Building2 size={14} className="text-[#0879D9] dark:text-[#00C2E8]" />
              </div>

              {isEditing ? (
                <div className="relative mt-1.5 w-full min-w-0">
                  <select
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="h-9 w-full min-w-0 appearance-none rounded-lg border border-[#D8E4EC] bg-white pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
                  >
                    <option value="" disabled>{language === "hi" ? "विभाग चुनें" : "Select Department"}</option>
                    {displayedDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]"
                  />
                </div>
              ) : (
                <p className="mt-1 truncate text-sm font-bold text-[#07365A] dark:text-white">
                  {employee.department || (language === "hi" ? "असाइन नहीं किया गया" : "Not Assigned")}
                </p>
              )}
            </div>

            {/* Field 3: DESIGNATION */}
            <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-[#F8FAFC] p-3.5 dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("employees.designation") || "DESIGNATION"}
                </label>
                <BriefcaseBusiness size={14} className="text-[#0879D9] dark:text-[#00C2E8]" />
              </div>

              {isEditing ? (
                <div className="relative mt-1.5 w-full min-w-0">
                  <select
                    value={formData.designation}
                    onChange={(e) => handleChange("designation", e.target.value)}
                    disabled={!formData.department || availableDesignations.length === 0}
                    className="h-9 w-full min-w-0 appearance-none rounded-lg border border-[#D8E4EC] bg-white pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white disabled:opacity-50"
                  >
                    <option value="" disabled>{language === "hi" ? "पद चुनें" : "Select Designation"}</option>
                    {availableDesignations.map((desig) => (
                      <option key={desig} value={desig}>
                        {desig}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]"
                  />
                </div>
              ) : (
                <p className="mt-1 truncate text-sm font-bold text-[#07365A] dark:text-white">
                  {employee.designation || (language === "hi" ? "असाइन नहीं किया गया" : "Not Assigned")}
                </p>
              )}
            </div>

            {/* Field 4: ROLE */}
            <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-[#F8FAFC] p-3.5 dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("employees.role") || "ROLE"}
                </label>
                {normalizeRole(employee.role) === ROLES.SUPER_ADMIN ? (
                  <Crown size={14} className="text-[#D97706]" />
                ) : (
                  <ShieldCheck size={14} className="text-[#0879D9] dark:text-[#00C2E8]" />
                )}
              </div>

              {isEditing ? (
                isSuperAdmin ? (
                  <div className="relative mt-1.5 w-full min-w-0">
                    <select
                      value={formData.role}
                      onChange={(e) => handleChange("role", e.target.value)}
                      className="h-9 w-full min-w-0 appearance-none rounded-lg border border-[#D8E4EC] bg-white pl-3 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
                    >
                      <option value="employee">{getRoleLabel("employee", t)}</option>
                      <option value="administrator">{getRoleLabel("administrator", t)}</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#66829A]"
                    />
                  </div>
                ) : (
                  <div className="mt-1.5 flex w-full min-w-0 items-center justify-between text-xs text-[#66829A]">
                    <span className="truncate font-semibold text-[#07365A] dark:text-white">
                      {getRoleLabel(formData.role, t)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#66829A] shrink-0">
                      <Lock size={11} />
                      {getRoleLabel("super_admin", t)}
                    </span>
                  </div>
                )
              ) : (
                <p className="mt-1 truncate text-sm font-bold text-[#07365A] dark:text-white">
                  {getRoleLabel(employee.role, t)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            4. PERSONAL DETAILS (STRUCTURED 3-COL INFORMATION PANEL)
        ================================================= */}
        <section className="w-full rounded-2xl border border-[#D8E4EC] bg-white p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#07365A] dark:text-white">
              {language === "hi" ? "व्यक्तिगत विवरण" : "Personal Details"}
            </h2>
            <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "कर्मचारी की व्यक्तिगत और संपर्क जानकारी।" : "Employee personal and contact information."}
            </p>
          </div>

          <div className="grid w-full gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Field 1: Full Name */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                <UserRound size={15} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {language === "hi" ? "पूरा नाम" : "FULL NAME"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white">
                {fullName}
              </p>
            </div>

            {/* Field 2: Email */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                  <Mail size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                    {language === "hi" ? "ईमेल पता" : "EMAIL ADDRESS"}
                  </span>
                </div>
                {employee.isEmailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-bold text-[#00A878] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00A878]" />
                    {language === "hi" ? "सत्यापित" : "Verified"}
                  </span>
                )}
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white">
                {employee.email}
              </p>
            </div>

            {/* Field 3: Phone */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                  <Phone size={15} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                    {language === "hi" ? "फ़ोन नंबर" : "PHONE NUMBER"}
                  </span>
                </div>
                {employee.isPhoneVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-bold text-[#00A878] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00A878]" />
                    {language === "hi" ? "सत्यापित" : "Verified"}
                  </span>
                )}
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white">
                {employee.phone || (language === "hi" ? "उपलब्ध नहीं" : "Not provided")}
              </p>
            </div>

            {/* Field 4: DOB */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                <CalendarDays size={15} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {language === "hi" ? "जन्म तिथि" : "DATE OF BIRTH"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white">
                {formatDate(employee.dateOfBirth)}
              </p>
            </div>

            {/* Field 5: Gender */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                <UserRound size={15} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {language === "hi" ? "लिंग" : "GENDER"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white capitalize">
                {employee.gender || (language === "hi" ? "उपलब्ध नहीं" : "Not provided")}
              </p>
            </div>

            {/* Field 6: Qualification */}
            <div className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-[#E1E9EF] bg-[#F8FBFC] p-3.5 min-h-[78px] dark:border-[#1E435E] dark:bg-[#0D2430]">
              <div className="flex items-center gap-2 text-[#0879D9] dark:text-[#00C2E8]">
                <GraduationCap size={15} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {language === "hi" ? "योग्यता" : "QUALIFICATION"}
                </span>
              </div>
              <p className="mt-2 truncate text-xs font-bold text-[#07365A] dark:text-white capitalize">
                {employee.qualification || (language === "hi" ? "उपलब्ध नहीं" : "Not provided")}
              </p>
            </div>
          </div>
        </section>

        {/* =================================================
            6. COMPACT METADATA STRIP
        ================================================= */}
        <section className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-white p-3.5 dark:border-[#1E435E] dark:bg-[#0B2538]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "खाता स्थिति" : "ACCOUNT STATUS"}
            </span>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[#07365A] dark:text-white">
              <span
                className={`h-2 w-2 rounded-full ${
                  employee.isBlocked ? "bg-[#E5484D]" : "bg-[#00A878]"
                }`}
              />
              <span>{employee.isBlocked ? (language === "hi" ? "ब्लॉक किया गया" : "Blocked") : (t("common.active") || "Active")}</span>
            </p>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-white p-3.5 dark:border-[#1E435E] dark:bg-[#0B2538]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "कर्मचारी बनने की तिथि" : "EMPLOYEE SINCE"}
            </span>
            <p className="mt-1 text-xs font-bold text-[#07365A] dark:text-white">
              {formatDate(employee.createdAt)}
            </p>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-white p-3.5 dark:border-[#1E435E] dark:bg-[#0B2538]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? "अंतिम अपडेट" : "LAST UPDATED"}
            </span>
            <p className="mt-1 text-xs font-bold text-[#07365A] dark:text-white">
              {formatDate(employee.updatedAt)}
            </p>
          </div>

          <div className="w-full min-w-0 rounded-xl border border-[#E1E9EF] bg-white p-3.5 dark:border-[#1E435E] dark:bg-[#0B2538]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
              {t("employees.employeeId") || "EMPLOYEE ID"}
            </span>
            <p className="mt-1 font-mono text-xs font-bold text-[#0879D9] dark:text-[#00C2E8]">
              {employee.employeeId || "MM—"}
            </p>
          </div>
        </section>

        {/* =================================================
            7. ENTERPRISE FOOTER
        ================================================= */}
        <footer className="flex w-full flex-col justify-between gap-2 border-t border-[#D8E4EC] py-5 text-xs text-[#718894] dark:border-[#1E435E] dark:text-[#8CB0C7] sm:flex-row">
          <p>© 2026 MindMatrix. {language === "hi" ? "कार्यबल प्रबंधन। सर्वाधिकार सुरक्षित।" : "Workforce Management. All rights reserved."}</p>

          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-[#00A878]" />
            <span>{language === "hi" ? "सुरक्षित प्रशासनिक वातावरण" : "Secure administrative environment"}</span>
          </div>
        </footer>
      </div>

      {/* =================================================
          8. ROLE CHANGE CONFIRMATION MODAL
      ================================================= */}
      {roleChangeModalOpen && employee && (
        <Modal
          isOpen={roleChangeModalOpen}
          onClose={() => !saving && setRoleChangeModalOpen(false)}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
            {normalizeRole(formData.role) === ROLES.SUPER_ADMIN &&
            normalizeRole(employee.role) !== ROLES.SUPER_ADMIN ? (
              <div>
                <div className="border-b border-[#EDF3F7] p-5 dark:border-[#1E435E]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                      <ShieldAlert size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#07365A] dark:text-white">
                        {language === "hi" ? "सुपर प्रशासक एक्सेस प्रदान करें?" : "Grant Super Administrator Access?"}
                      </h3>
                      <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                        {fullName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3.5 text-xs">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    {language === "hi" ? "इस खाते को पूर्ण सिस्टम-स्तरीय प्रशासनिक अनुमतियां और RBAC प्रबंधन मंजूरी प्राप्त होगी।" : "This account will receive full system-level administrative permissions and RBAC management clearance."}
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8FBFC] p-3 dark:bg-[#0D2430]">
                    <div>
                      <span className="text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "वर्तमान भूमिका:" : "Current role:"}</span>
                      <p className="mt-0.5 font-bold text-[#07365A] dark:text-white">
                        {getRoleLabel(employee.role, t)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "नई भूमिका:" : "New role:"}</span>
                      <p className="mt-0.5 font-bold text-amber-700 dark:text-amber-400">
                        {getRoleLabel("super_admin", t)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1E435E] dark:bg-[#0D2A3E]">
                  <button
                    type="button"
                    onClick={() => setRoleChangeModalOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-[#D8E4EC] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF]"
                  >
                    {t("common.cancel") || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRoleChange}
                    disabled={saving}
                    className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    {saving ? (language === "hi" ? "प्रदान किया जा रहा है..." : "Granting...") : (language === "hi" ? "एक्सेस प्रदान करें" : "Grant Access")}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="border-b border-[#EDF3F7] p-5 dark:border-[#1E435E]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF6F9] text-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#07365A] dark:text-white">
                        {language === "hi" ? "खाता भूमिका बदलें?" : "Change Account Role?"}
                      </h3>
                      <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                        {fullName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8FBFC] p-3 dark:bg-[#0D2430]">
                    <div>
                      <span className="text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "वर्तमान भूमिका:" : "Current role:"}</span>
                      <p className="mt-0.5 font-bold text-[#07365A] dark:text-white">
                        {getRoleLabel(employee.role, t)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#66829A] dark:text-[#8CB0C7]">{language === "hi" ? "नई भूमिका:" : "New role:"}</span>
                      <p className="mt-0.5 font-bold text-[#0879D9] dark:text-[#00C2E8]">
                        {getRoleLabel(formData.role, t)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                    {language === "hi" ? "यह तुरंत सभी मॉड्यूल में एक्सेस अनुमतियों को अपडेट करेगा।" : "This will immediately update access permissions across all modules."}
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3.5 dark:border-[#1E435E] dark:bg-[#0D2A3E]">
                  <button
                    type="button"
                    onClick={() => setRoleChangeModalOpen(false)}
                    disabled={saving}
                    className="rounded-xl border border-[#D8E4EC] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF]"
                  >
                    {t("common.cancel") || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRoleChange}
                    disabled={saving}
                    className="rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9] disabled:opacity-50"
                  >
                    {saving ? (language === "hi" ? "सहेजा जा रहा है..." : "Saving...") : (language === "hi" ? "परिवर्तन की पुष्टि करें" : "Confirm Change")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
