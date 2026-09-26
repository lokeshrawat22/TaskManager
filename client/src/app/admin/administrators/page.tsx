"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  Crown,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  RefreshCw,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { can, getRoleLabel, Role } from "@/constants/rbac";
import { useDepartments } from "@/hooks/useDepartments";
import { useDesignations } from "@/hooks/useDesignations";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";

interface Administrator {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department?: string;
  designation?: string;
  phone?: string;
  countryCode?: string;
  isBlocked?: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface EmployeeCandidate {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId?: string;
  role?: string;
  department?: string;
  designation?: string;
  phone?: string;
  countryCode?: string;
  isBlocked?: boolean;
}

interface ProfileResponse {
  success: boolean;
  data?: {
    _id: string;
    role: Role;
    email: string;
    firstName: string;
    lastName: string;
  };
  user?: {
    _id: string;
    role: Role;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdministratorsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { currentUser, loading: authLoading } = useAuth();

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loadingRole, setLoadingRole] = useState(true);

  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [statusConfirmAdmin, setStatusConfirmAdmin] = useState<Administrator | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "administrator" as Role,
    department: "",
    designation: "Administrator",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Existing employees eligible for promotion to Administrator
  const [employeeCandidates, setEmployeeCandidates] = useState<EmployeeCandidate[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const { departmentNames: masterDeptNames } = useDepartments({ status: "ACTIVE" });
  const { designationNames: masterDesigNames } = useDesignations({
    department: formData.department,
    status: "ACTIVE",
  });
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);

  // Consume Current User Role from AuthContext
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role as Role);
      setCurrentUserId(currentUser._id || currentUser.id || "");
      setLoadingRole(false);
    } else if (!authLoading) {
      setLoadingRole(false);
    }
  }, [currentUser, authLoading]);

  // Fetch Administrators
  const fetchAdministrators = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ success: boolean; data: any }>("/api/admin/administrators", {
        method: "GET",
      });
      if (res?.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : res.data?.administrators || [];
        setAdministrators(list);
      }
    } catch (err: any) {
      console.error("Failed to fetch administrators:", err);
      showToast.error(err?.message || (language === "hi" ? "प्रशासक लोड करने में विफल।" : "Failed to load administrators."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole && can(currentRole, "administrators.view")) {
      fetchAdministrators();
    }
  }, [currentRole]);

  // Filtered Administrators
  const filteredAdmins = useMemo(() => {
    return administrators.filter((admin) => {
      const fullName = `${admin.firstName || ""} ${admin.lastName || ""}`.toLowerCase();
      const email = (admin.email || "").toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchesQuery = !q || fullName.includes(q) || email.includes(q);
      // This page is for Administrator accounts only. Super Administrators are hidden.
      const isSuperAdmin =
        admin.role === "super_admin" || (admin.role as string) === "Super Administrator";
      const matchesRole =
        !isSuperAdmin &&
        (filterRole === "ALL" ||
          (filterRole === "administrator" &&
            (admin.role === "administrator" ||
              admin.role === "admin" ||
              (admin.role as string) === "Administrator")));

      const isBlocked = !!admin.isBlocked;
      const matchesStatus =
        filterStatus === "ALL" ||
        (filterStatus === "ACTIVE" && !isBlocked) ||
        (filterStatus === "BLOCKED" && isBlocked);

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [administrators, searchQuery, filterRole, filterStatus]);

  // Open Add Modal — promote an existing employee instead of creating a duplicate account
  const handleOpenAddModal = async () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: "administrator",
      department: "",
      designation: "",
      phone: "",
    });
    setSelectedEmployeeId("");
    setEmployeeSearch("");
    setEmployeePickerOpen(false);
    setEmployeeCandidates([]);
    setFormError("");
    setAddModalOpen(true);

    try {
      setLoadingEmployees(true);
      const res = await apiRequest<{ success: boolean; data: any }>("/api/users/employees", {
        method: "GET",
      });

      const rawEmployees = res?.success
        ? (Array.isArray(res.data) ? res.data : res.data?.employees || [])
        : [];

      const eligibleEmployees: EmployeeCandidate[] = rawEmployees
        .filter((employee: any) => {
          const role = String(employee?.role || "").toLowerCase().trim();
          const isEmployeeRole = role === "employee" || role === "user" || role === "staff";
          const isBlocked = Boolean(employee?.isBlocked);
          return isEmployeeRole && !isBlocked;
        })
        .map((employee: any) => ({
          _id: employee._id || employee.id,
          firstName:
            employee.firstName ||
            employee.first_name ||
            employee.name?.split(" ")?.[0] ||
            "",
          lastName:
            employee.lastName ||
            employee.last_name ||
            employee.name?.split(" ")?.slice(1).join(" ") ||
            "",
          email: employee.email || "",
          employeeId: employee.employeeId || employee.employee_id || "",
          role: employee.role || "employee",
          department: employee.department || employee.departmentName || "",
          designation: employee.designation || employee.title || employee.jobTitle || "Employee",
          phone: employee.phone || employee.phoneNumber || "",
          countryCode: employee.countryCode || "",
          isBlocked: Boolean(employee.isBlocked),
        }))
        .filter((employee: EmployeeCandidate) => Boolean(employee._id));

      setEmployeeCandidates(eligibleEmployees);
    } catch (err: any) {
      console.error("Failed to load employees for administrator promotion:", err);
      setFormError(err?.message || (language === "hi" ? "मौजूदा कर्मचारियों को लोड करने में असमर्थ।" : "Unable to load existing employees."));
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleDepartmentChange = (department: string) => {
    setFormData((previous) => ({
      ...previous,
      department,
      designation: "",
    }));
  };

  const availableDesignations = useMemo(() => {
    if (!formData.department) return [];
    const list = [...masterDesigNames];
    if (formData.designation && !list.includes(formData.designation)) {
      list.unshift(formData.designation);
    }
    return Array.from(new Set(list));
  }, [formData.department, formData.designation, masterDesigNames]);

  const filteredEmployeeCandidates = useMemo(() => {
    const query = employeeSearch.trim().toLowerCase();
    if (!query) return employeeCandidates;

    return employeeCandidates.filter((employee) => {
      const name = `${employee.firstName} ${employee.lastName}`.trim().toLowerCase();
      return (
        name.includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        String(employee.employeeId || "").toLowerCase().includes(query) ||
        String(employee.department || "").toLowerCase().includes(query)
      );
    });
  }, [employeeCandidates, employeeSearch]);

  const handleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setEmployeePickerOpen(false);
    const employee = employeeCandidates.find((item) => item._id === employeeId);

    if (!employee) {
      setFormData((previous) => ({
        ...previous,
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        designation: "",
        phone: "",
      }));
      return;
    }

    setFormData((previous) => ({
      ...previous,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department || "",
      designation: employee.designation || "Employee",
      phone: employee.phone || "",
      role: "administrator",
      password: "",
    }));
    setFormError("");
  };

  // Administrators are edited from the Employee Details page.
  const handleOpenEditModal = (admin: Administrator) => {
    const databaseId = admin._id;
    if (!databaseId) return;
    router.push(`/admin/employees/${encodeURIComponent(databaseId)}`);
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (admin: Administrator) => {
    setSelectedAdmin(admin);
    setDeleteModalOpen(true);
  };

  // Submit Add — promote the selected existing employee to Administrator
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedEmployeeId) {
      setFormError(t("administrators.selectEmployeeError"));
      return;
    }

    const employee = employeeCandidates.find((item) => item._id === selectedEmployeeId);
    if (!employee) {
      setFormError(t("administrators.employeeNotFoundError"));
      return;
    }

    if (!formData.department.trim()) {
      setFormError(t("administrators.selectDepartmentError"));
      return;
    }

    if (!formData.designation.trim()) {
      setFormError(t("administrators.selectDesignationError"));
      return;
    }

    try {
      setSubmitting(true);

      // Existing employee account is updated in-place; no duplicate account is created.
      const res = await apiRequest<{ success: boolean; message?: string; data?: any }>(
        `/api/users/${encodeURIComponent(employee._id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: "administrator",
            employeeId: employee.employeeId || undefined,
            department: formData.department.trim(),
            designation: formData.designation.trim(),
          }),
        },
      );

      if (!res?.success) {
        throw new Error(res?.message || t("administrators.failedToPromote"));
      }

      showToast.success(res.message || `${employee.firstName} ${employee.lastName} ${t("administrators.promotedSuccess")}`);
      setAddModalOpen(false);
      setSelectedEmployeeId("");
      setEmployeeSearch("");
      setEmployeePickerOpen(false);
      setEmployeeCandidates([]);
      fetchAdministrators();
    } catch (err: any) {
      setFormError(err?.message || t("administrators.failedToPromote"));
    } finally {
      setSubmitting(false);
    }
  };

  // Administrator editing is handled on the Employee Details page.
  // The old Edit Administrator modal is intentionally removed.

  // Toggle Block (Activate / Deactivate)
  const handleToggleBlock = (admin: Administrator) => {
    setStatusConfirmAdmin(admin);
  };

  const handleConfirmStatusToggle = async () => {
    if (!statusConfirmAdmin) return;
    const isDeactivating = !statusConfirmAdmin.isBlocked;

    try {
      setSubmitting(true);
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/admin/administrators/${statusConfirmAdmin._id}/block`, {
        method: "PATCH",
      });
      if (res?.success) {
        showToast.success(
          res.message ||
            (isDeactivating
              ? t("administrators.deactivatedSuccess")
              : t("administrators.reactivatedSuccess"))
        );
        setStatusConfirmAdmin(null);
        fetchAdministrators();
      }
    } catch (err: any) {
      showToast.error(
        err?.message ||
          (isDeactivating
            ? t("administrators.failedToDeactivate")
            : t("administrators.failedToReactivate"))
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Administrator
  const handleDeleteSubmit = async () => {
    if (!selectedAdmin) return;

    try {
      setSubmitting(true);
      const res = await apiRequest<{ success: boolean; message: string }>(`/api/admin/administrators/${selectedAdmin._id}`, {
        method: "DELETE",
      });

      if (res?.success) {
        showToast.success(res.message || t("administrators.adminDeletedSuccessfully"));
        setDeleteModalOpen(false);
        fetchAdministrators();
      }
    } catch (err: any) {
      showToast.error(err?.message || (language === "hi" ? "प्रशासक हटाने में विफल।" : "Failed to delete administrator."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#087D8F]" />
      </div>
    );
  }

  // Access Denied Screen
  if (!currentRole || !can(currentRole, "administrators.view")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
          <ShieldAlert size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#063D63] dark:text-white">
          {t("administrators.accessRestricted")}
        </h2>
        <p className="mt-2 text-sm text-[#718894] dark:text-[#8FA8B2]">
          {t("administrators.accessRestrictedDesc")}
        </p>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#063D63] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#053251] dark:bg-[#0E5B8C] dark:hover:bg-[#0C4E78]"
        >
          {t("administrators.returnToDashboard")}
        </button>
      </div>
    );
  }

  const canCreate = can(currentRole, "administrators.create");
  const canEdit = can(currentRole, "administrators.edit");
  const canDelete = can(currentRole, "administrators.delete");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#063D63] dark:text-white">
              {t("administrators.administratorsTitle")}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
              <Crown size={12} />
              {t("administrators.superAdminView")}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#718894] dark:text-[#8FA8B2]">
            {t("administrators.administratorsSubtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdministrators}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-[#C7D5DC] bg-white px-3.5 py-2 text-xs font-semibold text-[#063D63] shadow-sm transition hover:bg-[#F4F9FB] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-white dark:hover:bg-[#153445]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("administrators.refresh")}
          </button>
          {canCreate && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-xl bg-[#063D63] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#053251] dark:bg-[#0E5B8C] dark:hover:bg-[#0C4E78]"
            >
              <UserPlus size={16} />
              {t("administrators.addAdministrator")}
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#C7D5DC] bg-white p-4 shadow-sm dark:border-[#2A4858] dark:bg-[#102A38]">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8FA8B2]" />
          <input
            type="text"
            placeholder={t("administrators.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-[#C7D5DC] bg-white pl-9 pr-4 py-2 text-sm text-[#063D63] focus:border-[#087D8F] focus:outline-none dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-xl border border-[#C7D5DC] bg-white px-3 py-2 text-xs font-medium text-[#063D63] focus:border-[#087D8F] focus:outline-none dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
          >
            <option value="ALL">{t("common.allRoles")}</option>
            <option value="administrator">{t("common.administrator")}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-[#C7D5DC] bg-white px-3 py-2 text-xs font-medium text-[#063D63] focus:border-[#087D8F] focus:outline-none dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
          >
            <option value="ALL">{t("common.allStatuses")}</option>
            <option value="ACTIVE">{t("common.active")}</option>
            <option value="BLOCKED">{language === "hi" ? "निष्क्रिय" : "Deactivated"}</option>
          </select>
        </div>
      </div>

      {/* Administrators List */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-[#C7D5DC] bg-white shadow-sm dark:border-[#2A4858] dark:bg-[#102A38]">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#087D8F]" />
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-base font-semibold text-[#063D63] dark:text-white">{t("administrators.noAdministratorsFound")}</p>
            <p className="mt-1 text-xs text-[#718894] dark:text-[#8FA8B2]">{t("administrators.noAdministratorsDesc")}</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto responsive-table-scroll">
            <table className="enterprise-table w-full min-w-[800px] text-left text-sm border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
              <thead className="border-b border-[#D8DEE8] bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wider text-[#718894] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8FA8B2]">
                <tr className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                  <th className="px-6 py-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colAdministrator")}</th>
                  <th className="px-6 py-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colRole")}</th>
                  <th className="px-6 py-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colDepartmentTitle")}</th>
                  <th className="px-6 py-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colStatus")}</th>
                  <th className="px-6 py-4 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colCreatedAt")}</th>
                  <th className="px-6 py-4 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("administrators.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#18333F] dark:bg-[#0B202B]">
                {filteredAdmins.map((admin) => {
                  const isSuper = admin.role === "super_admin" || (admin.role as string) === "Super Administrator";
                  const isSelf = admin._id === currentUserId;

                  return (
                    <tr key={admin._id} className="transition hover:bg-[#F4F9FB] dark:hover:bg-[#153445]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                            isSuper
                              ? "bg-amber-500/15 text-amber-700 border border-amber-300 dark:border-amber-700/50 dark:text-amber-400"
                              : "bg-[#EAF7F9] text-[#087D8F] border border-[#C7D5DC] dark:border-[#2A4858] dark:bg-[#123C46] dark:text-[#12B8C8]"
                          }`}>
                            {isSuper ? <Crown size={18} /> : `${admin.firstName?.[0] || ""}${admin.lastName?.[0] || ""}`}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#063D63] dark:text-white">
                                {admin.firstName} {admin.lastName}
                              </span>
                              {isSelf && (
                                <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                  {t("administrators.you")}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-[#718894] dark:text-[#8FA8B2]">{admin.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isSuper
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50"
                            : "bg-[#EAF7F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#12B8C8] border border-[#C7D5DC] dark:border-[#2A4858]"
                        }`}>
                          {isSuper ? <Crown size={12} /> : <ShieldCheck size={12} />}
                          {getRoleLabel(admin.role, t)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-[#063D63] dark:text-white font-medium">
                          {admin.designation || (language === "hi" ? "प्रशासक" : "Administrator")}
                        </div>
                        <div className="text-[11px] text-[#718894] dark:text-[#8FA8B2]">
                          {admin.department || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {admin.isBlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            {language === "hi" ? "निष्क्रिय" : "Deactivated"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {t("common.active")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-[#718894] dark:text-[#8FA8B2]">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN") : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(admin)}
                              title={t("administrators.editAdministrator")}
                              aria-label={t("administrators.editAdministrator")}
                              className="rounded-lg p-1.5 text-[#718894] transition hover:bg-[#EAF7F9] hover:text-[#087D8F] dark:hover:bg-[#153445]"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canEdit && !isSelf && (
                            <button
                              onClick={() => handleToggleBlock(admin)}
                              title={admin.isBlocked ? t("administrators.reactivateAccount") : t("administrators.deactivateAccount")}
                              aria-label={admin.isBlocked ? t("administrators.reactivateAccount") : t("administrators.deactivateAccount")}
                              className={`rounded-lg p-1.5 transition ${
                                admin.isBlocked
                                  ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              }`}
                            >
                              {admin.isBlocked ? <UserCheck size={16} /> : <UserX size={16} />}
                            </button>
                          )}
                          {canDelete && !isSelf && (
                            <button
                              onClick={() => handleOpenDeleteModal(admin)}
                              title={t("administrators.deleteAdministrator")}
                              aria-label={t("administrators.deleteAdministrator")}
                              className="rounded-lg p-1.5 text-[#718894] transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Administrator Modal — promote an existing employee */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => { setAddModalOpen(false); setEmployeePickerOpen(false); }}
        >
          <div className="w-full max-w-xl rounded-2xl border border-[#C7D5DC] bg-white p-6 shadow-2xl dark:border-[#2A4858] dark:bg-[#102A38]">
            <div className="flex items-center justify-between pb-4 border-b border-[#C7D5DC] dark:border-[#2A4858]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F9] text-[#087D8F] dark:bg-[#123C46] dark:text-[#12B8C8]">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#063D63] dark:text-white">{t("administrators.addNewAdministrator")}</h3>
                  <p className="mt-0.5 text-[11px] text-[#718894] dark:text-[#8FA8B2]">{t("administrators.promoteEmployeeAccount")}</p>
                </div>
              </div>
              <button
                onClick={() => { setAddModalOpen(false); setEmployeePickerOpen(false); }}
                className="text-[#718894] hover:text-[#063D63] dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#063D63] dark:text-white">{t("administrators.selectEmployee")} *</label>
                <div className="relative mt-1">
                  <button
                    type="button"
                    onClick={() => !loadingEmployees && !submitting && setEmployeePickerOpen((open) => !open)}
                    disabled={loadingEmployees || submitting}
                    className="flex min-h-[46px] w-full items-center justify-between rounded-xl border border-[#C7D5DC] bg-white px-3.5 text-left text-sm text-[#063D63] shadow-sm transition hover:border-[#087D8F] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
                  >
                    <span className={selectedEmployeeId ? "font-medium" : "text-[#718894] dark:text-[#8FA8B2]"}>
                      {loadingEmployees
                        ? t("administrators.loadingEmployees")
                        : selectedEmployeeId
                          ? (() => {
                              const selected = employeeCandidates.find((item) => item._id === selectedEmployeeId);
                              return selected
                                ? `${selected.firstName} ${selected.lastName}${selected.employeeId ? ` • ${selected.employeeId}` : ""}`
                                : t("administrators.selectExistingEmployee");
                            })()
                          : t("administrators.selectExistingEmployee")}
                    </span>
                    <svg className={`h-4 w-4 shrink-0 text-[#5E7D8D] transition-transform ${employeePickerOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {employeePickerOpen && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-[#C7D5DC] bg-white shadow-xl dark:border-[#2A4858] dark:bg-[#102A38]">
                      <div className="border-b border-[#E3EBEF] p-2.5 dark:border-[#2A4858]">
                        <div className="relative">
                          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#718894]" />
                          <input
                            autoFocus
                            value={employeeSearch}
                            onChange={(e) => setEmployeeSearch(e.target.value)}
                            placeholder={t("administrators.searchEmployeePlaceholder")}
                            className="h-10 w-full rounded-lg border border-[#D5E1E7] bg-[#F8FBFC] pl-9 pr-3 text-xs text-[#063D63] outline-none transition focus:border-[#087D8F] focus:ring-2 focus:ring-[#087D8F]/10 dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto p-1.5">
                        {filteredEmployeeCandidates.length > 0 ? (
                          filteredEmployeeCandidates.map((employee) => {
                            const isSelected = employee._id === selectedEmployeeId;
                            const initials = `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase();
                            return (
                              <button
                                key={employee._id}
                                type="button"
                                onClick={() => handleEmployeeSelection(employee._id)}
                                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${isSelected ? "bg-[#EAF7F9] dark:bg-[#123C46]" : "hover:bg-[#F4F9FB] dark:hover:bg-[#153445]"}`}
                              >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EAF7F9] text-[10px] font-bold text-[#087D8F] dark:bg-[#123C46] dark:text-[#12B8C8]">
                                  {initials || "E"}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center gap-2 text-xs font-semibold text-[#063D63] dark:text-white">
                                    <span className="truncate">{employee.firstName} {employee.lastName}</span>
                                    {employee.employeeId && (
                                      <span className="shrink-0 rounded-md bg-[#F1F6F8] px-1.5 py-0.5 text-[10px] font-medium text-[#5E7D8D] dark:bg-[#173847] dark:text-[#9DB3BD]">{employee.employeeId}</span>
                                    )}
                                  </span>
                                  <span className="mt-0.5 block truncate text-[10px] text-[#718894] dark:text-[#8FA8B2]">
                                    {employee.department || (language === "hi" ? "कोई विभाग नहीं" : "No department")} {employee.designation ? `• ${employee.designation}` : ""}
                                  </span>
                                </span>
                                {isSelected && <CheckCircle2 size={16} className="shrink-0 text-[#087D8F]" />}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-7 text-center">
                            <Search size={18} className="mx-auto mb-2 text-[#9AAEB8]" />
                            <p className="text-xs font-semibold text-[#5E7D8D] dark:text-[#A9BBC3]">{t("administrators.noEmployeesFound")}</p>
                            <p className="mt-1 text-[10px] text-[#8AA0AA]">{t("administrators.tryDifferentSearch")}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {!loadingEmployees && employeeCandidates.length === 0 && (
                  <p className="mt-1.5 text-[11px] text-[#718894] dark:text-[#8FA8B2]">
                    {t("administrators.noActiveEmployeesAvailable")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#063D63] dark:text-white">{t("administrators.assignedRole")}</label>
                  <select
                    value="administrator"
                    disabled
                    className="mt-1 w-full rounded-xl border border-[#C7D5DC] bg-[#F4F9FC] px-3 py-2.5 text-sm font-semibold text-[#087D8F] outline-none disabled:cursor-not-allowed dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-[#12B8C8]"
                  >
                    <option value="administrator">{t("common.administrator")}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#063D63] dark:text-white">{t("administrators.department")} *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    disabled={!selectedEmployeeId || submitting}
                    className="mt-1 w-full rounded-xl border border-[#C7D5DC] bg-white px-3 py-2.5 text-sm text-[#063D63] focus:border-[#087D8F] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
                  >
                    <option value="">{t("administrators.selectDepartment")}</option>
                    {masterDeptNames.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#063D63] dark:text-white">{t("administrators.designation")} *</label>
                <select
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData((previous) => ({ ...previous, designation: e.target.value }))}
                  disabled={!selectedEmployeeId || !formData.department || submitting}
                  className="mt-1 w-full rounded-xl border border-[#C7D5DC] bg-white px-3 py-2.5 text-sm text-[#063D63] focus:border-[#087D8F] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white"
                >
                  <option value="">{t("administrators.selectDesignation")}</option>
                  {availableDesignations.map((designation) => (
                    <option key={designation} value={designation}>{designation}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#C7D5DC] dark:border-[#2A4858]">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl border border-[#C7D5DC] px-4 py-2 text-sm font-semibold text-[#718894] transition hover:bg-[#F4F9FB] dark:border-[#2A4858] dark:hover:bg-[#153445]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting || loadingEmployees || !selectedEmployeeId}
                  className="flex items-center gap-2 rounded-xl bg-[#063D63] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#053251] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0E5B8C] dark:hover:bg-[#0C4E78]"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {t("administrators.makeAdministrator")}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedAdmin && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-[#102A38]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <Trash2 size={24} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#063D63] dark:text-white">{t("administrators.deleteAdminTitle")}</h3>
            <p className="mt-2 text-sm text-[#718894] dark:text-[#8FA8B2]">
              {t("administrators.deleteAdminConfirm")}{" "}
              <strong className="text-[#063D63] dark:text-white">
                {selectedAdmin.firstName} {selectedAdmin.lastName}
              </strong>{" "}
              ({selectedAdmin.email})? {t("administrators.actionCannotBeUndone")}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-xl border border-[#C7D5DC] px-4 py-2 text-sm font-semibold text-[#718894] transition hover:bg-[#F4F9FB] dark:border-[#2A4858] dark:hover:bg-[#153445]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {t("administrators.confirmDelete")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Status Toggle Modal */}
      {statusConfirmAdmin && (
        <Modal
          isOpen={Boolean(statusConfirmAdmin)}
          onClose={() => setStatusConfirmAdmin(null)}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#C7D5DC] bg-white p-6 shadow-2xl dark:border-[#2A4858] dark:bg-[#102A38]">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              statusConfirmAdmin.isBlocked
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
            }`}>
              {statusConfirmAdmin.isBlocked ? <UserCheck size={24} /> : <UserX size={24} />}
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#063D63] dark:text-white">
              {statusConfirmAdmin.isBlocked ? t("administrators.reactivateAdminTitle") : t("administrators.deactivateAdminTitle")}
            </h3>
            <p className="mt-2 text-sm text-[#718894] dark:text-[#8FA8B2]">
              {language === "hi"
                ? (statusConfirmAdmin.isBlocked
                    ? `${statusConfirmAdmin.firstName} ${statusConfirmAdmin.lastName} को पुनः सक्रिय करने से उनका प्रशासनिक डैशबोर्ड और एपीआई पहुँच बहाल हो जाएगी।`
                    : `${statusConfirmAdmin.firstName} ${statusConfirmAdmin.lastName} को निष्क्रिय करने से उनका सत्र तुरंत रद्द हो जाएगा और प्रशासनिक लॉगिन बंद हो जाएगा।`)
                : (statusConfirmAdmin.isBlocked
                    ? `Reactivating ${statusConfirmAdmin.firstName} ${statusConfirmAdmin.lastName} will restore their administrative dashboard and API access.`
                    : `Deactivating ${statusConfirmAdmin.firstName} ${statusConfirmAdmin.lastName} will immediately revoke their session and prevent administrative login.`)}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setStatusConfirmAdmin(null)}
                className="rounded-xl border border-[#C7D5DC] px-4 py-2 text-sm font-semibold text-[#718894] transition hover:bg-[#F4F9FB] dark:border-[#2A4858] dark:hover:bg-[#153445]"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmStatusToggle}
                disabled={submitting}
                className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                  statusConfirmAdmin.isBlocked
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {statusConfirmAdmin.isBlocked ? t("administrators.confirmReactivate") : t("administrators.confirmDeactivate")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
