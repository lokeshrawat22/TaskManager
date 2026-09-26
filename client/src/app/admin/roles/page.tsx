"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  BarChart,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Copy,
  Crown,
  Download,
  Eye,
  FileCode,
  FileSpreadsheet,
  Filter,
  Info,
  Key,
  Layers,
  LayoutGrid,
  Loader2,
  Lock,
  MinusCircle,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { can, getRoleLabel, Role } from "@/constants/rbac";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { GoToPage } from "@/components/ui/GoToPage";

// =====================================================
// TYPES
// =====================================================

interface RoleData {
  id?: string;
  role: string;
  name?: string;
  label: string;
  level?: number;
  description: string;
  permissionsCount: number;
  permissions: string[];
}

interface RolesResponse {
  success: boolean;
  data: {
    roles: RoleData[];
    allPermissions: string[];
  };
}

interface ProfileResponse {
  success: boolean;
  data?: { role: Role };
  user?: { role: Role };
}

// =====================================================
// PERMISSION METADATA HELPERS
// =====================================================

interface PermissionMeta {
  key: string;
  label: string;
  description: string;
  module: string;
}

const PERMISSION_METADATA_MAP: Record<string, { label: string; description: string; module: string }> = {
  "employees.view": {
    label: "employees.view",
    description: "View list of employees",
    module: "Employees",
  },
  "employees.create": {
    label: "employees.create",
    description: "Create new employee",
    module: "Employees",
  },
  "employees.edit": {
    label: "employees.edit",
    description: "Edit employee information",
    module: "Employees",
  },
  "employees.delete": {
    label: "employees.delete",
    description: "Delete employee",
    module: "Employees",
  },
  "employees.deactivate": {
    label: "employees.deactivate",
    description: "Deactivate employee account",
    module: "Employees",
  },
  "departments.view": {
    label: "departments.view",
    description: "View departments",
    module: "Departments",
  },
  "departments.create": {
    label: "departments.create",
    description: "Create department",
    module: "Departments",
  },
  "departments.edit": {
    label: "departments.edit",
    description: "Edit department",
    module: "Departments",
  },
  "departments.delete": {
    label: "departments.delete",
    description: "Delete department",
    module: "Departments",
  },
  "departments.manage": {
    label: "departments.manage",
    description: "Manage department structure and workforce allocation",
    module: "Departments",
  },
  "designations.view": {
    label: "designations.view",
    description: "View designations",
    module: "Departments",
  },
  "designations.manage": {
    label: "designations.manage",
    description: "Manage employee job titles and designations",
    module: "Departments",
  },
  "tasks.view": {
    label: "tasks.view",
    description: "View tasks",
    module: "Tasks",
  },
  "tasks.create": {
    label: "tasks.create",
    description: "Create task",
    module: "Tasks",
  },
  "tasks.edit": {
    label: "tasks.edit",
    description: "Edit existing tasks",
    module: "Tasks",
  },
  "tasks.delete": {
    label: "tasks.delete",
    description: "Delete assigned or organizational tasks",
    module: "Tasks",
  },
  "tasks.assign": {
    label: "tasks.assign",
    description: "Assign tasks to workforce members",
    module: "Tasks",
  },
  "reports.view": {
    label: "reports.view",
    description: "View organizational performance and workload analytics",
    module: "Reports",
  },
  "reports.export": {
    label: "reports.export",
    description: "Export summary and analytical reports",
    module: "Reports",
  },
  "exports.create": {
    label: "exports.create",
    description: "Generate and download datasets in CSV, Excel, or JSON",
    module: "Reports",
  },
  "administrators.view": {
    label: "administrators.view",
    description: "Inspect administrator roster and access clearances",
    module: "Administrators",
  },
  "administrators.create": {
    label: "administrators.create",
    description: "Provision new administrative accounts",
    module: "Administrators",
  },
  "administrators.edit": {
    label: "administrators.edit",
    description: "Modify administrator clearances and details",
    module: "Administrators",
  },
  "administrators.deactivate": {
    label: "administrators.deactivate",
    description: "Suspend or deactivate administrator accounts",
    module: "Administrators",
  },
  "administrators.delete": {
    label: "administrators.delete",
    description: "Permanently remove administrator privileges",
    module: "Administrators",
  },
  "roles.view": {
    label: "roles.view",
    description: "View role permission matrices and policy definitions",
    module: "Roles",
  },
  "roles.manage": {
    label: "roles.manage",
    description: "Configure system roles and policy bindings",
    module: "Roles",
  },
  "permissions.view": {
    label: "permissions.view",
    description: "Inspect granular permission registry",
    module: "Roles",
  },
  "permissions.manage": {
    label: "permissions.manage",
    description: "Update access policies and module capabilities",
    module: "Roles",
  },
  "notifications.view": {
    label: "notifications.view",
    description: "View system broadcasts and alert logs",
    module: "System",
  },
  "notifications.manage": {
    label: "notifications.manage",
    description: "Publish organization broadcasts and alert triggers",
    module: "System",
  },
  "audit_logs.view": {
    label: "audit_logs.view",
    description: "Inspect immutable security audit event trails",
    module: "Audit Logs",
  },
  "system.settings.manage": {
    label: "system.settings.manage",
    description: "Configure global enterprise platform settings",
    module: "System",
  },
};

function getPermissionMeta(key: string): PermissionMeta {
  if (PERMISSION_METADATA_MAP[key]) {
    return {
      key,
      label: PERMISSION_METADATA_MAP[key].label,
      description: PERMISSION_METADATA_MAP[key].description,
      module: PERMISSION_METADATA_MAP[key].module,
    };
  }

  // Derive module and description dynamically from key
  const parts = key.split(".");
  const modRaw = parts[0] || "General";
  const actionRaw = parts.slice(1).join(" ") || "action";

  const moduleName =
    modRaw.charAt(0).toUpperCase() + modRaw.slice(1).replace(/_/g, " ");

  const desc = `${actionRaw.charAt(0).toUpperCase() + actionRaw.slice(1)} ${moduleName.toLowerCase()}`;

  return {
    key,
    label: key,
    description: desc,
    module: moduleName,
  };
}

function getModuleBadgeStyle(module: string) {
  const m = module.toLowerCase();
  if (m.includes("employee")) {
    return {
      icon: Users,
      bg: "bg-[#EAF5FC] text-[#0879D9] border-[#CBE5F7] dark:bg-[#103248] dark:text-[#00C2E8] dark:border-[#184968]",
    };
  }
  if (m.includes("department")) {
    return {
      icon: Building2,
      bg: "bg-[#F3E8FF] text-[#8B5CF6] border-[#DDD6FE] dark:bg-[#2A1E4A] dark:text-[#A78BFA] dark:border-[#3D2C6A]",
    };
  }
  if (m.includes("task")) {
    return {
      icon: Clipboard,
      bg: "bg-[#E8F8F0] text-[#10B981] border-[#B2EAD0] dark:bg-[#0E3A30] dark:text-[#31C48D] dark:border-[#165545]",
    };
  }
  if (m.includes("report") || m.includes("export")) {
    return {
      icon: BarChart,
      bg: "bg-[#EBF5FA] text-[#0284C7] border-[#C3E4F6] dark:bg-[#103248] dark:text-[#38BDF8] dark:border-[#1E4A68]",
    };
  }
  if (m.includes("role") || m.includes("admin")) {
    return {
      icon: ShieldCheck,
      bg: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A] dark:bg-[#382810] dark:text-[#FBBF24] dark:border-[#543D18]",
    };
  }
  if (m.includes("audit")) {
    return {
      icon: Activity,
      bg: "bg-[#FEECEB] text-[#EF4444] border-[#FCA5A5] dark:bg-[#3D1A20] dark:text-[#F87171] dark:border-[#5C2329]",
    };
  }
  return {
    icon: Settings,
    bg: "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#334155]",
  };
}

// =====================================================
// MAIN ROLES & PERMISSIONS PAGE
// =====================================================

export default function RolesAndPermissionsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { currentUser, loading: authLoading } = useAuth();

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [rolesData, setRolesData] = useState<RoleData[]>([]);
  const [allPermissions, setAllPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Role for Role Overview / Detail Card
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>("super_admin");

  // View Navigation Tabs
  const [activeTab, setActiveTab] = useState<"matrix" | "roles">("matrix");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);

  // Pagination for Matrix
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [detailModalPermission, setDetailModalPermission] = useState<PermissionMeta | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // New Role Form State
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [newRoleBase, setNewRoleBase] = useState("employee");

  // 1. Consume Current User Role from AuthContext
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role as Role);
      setLoadingRole(false);
    } else if (!authLoading) {
      setLoadingRole(false);
    }
  }, [currentUser, authLoading]);

  // 2. Fetch Roles and Permissions
  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest<RolesResponse>(
        "/api/admin/roles-and-permissions",
        { method: "GET" }
      );
      if (res?.success && res.data) {
        const normalizedRoles: RoleData[] = (res.data.roles || []).map(
          (r: any) => ({
            ...r,
            role: String(r.role || r.id || "").toLowerCase().trim(),
            label: r.label || r.name || getRoleLabel(r.role || r.id),
            permissions: Array.from(new Set(r.permissions || [])),
            permissionsCount: Array.isArray(r.permissions)
              ? r.permissions.length
              : r.permissionsCount || 0,
          })
        );
        setRolesData(normalizedRoles);
        setAllPermissions(Array.from(new Set(res.data.allPermissions || [])));
      } else {
        setError("Failed to load roles and permissions. Please try again.");
      }
    } catch (err: any) {
      console.error("Failed to fetch roles & permissions:", err);
      setError(
        err?.message ||
          "Failed to load roles and permissions. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole && can(currentRole, "roles.view")) {
      fetchRolesAndPermissions();
    }
  }, [currentRole]);

  // Available Modules list
  const availableModules = useMemo(() => {
    const modules = new Set<string>();
    allPermissions.forEach((p) => {
      const meta = getPermissionMeta(p);
      modules.add(meta.module);
    });
    return Array.from(modules).sort();
  }, [allPermissions]);

  // Filtered Permissions list
  const filteredPermissions = useMemo(() => {
    return allPermissions
      .map(getPermissionMeta)
      .filter((perm) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          perm.key.toLowerCase().includes(query) ||
          perm.description.toLowerCase().includes(query) ||
          perm.module.toLowerCase().includes(query);

        if (!matchesSearch) return false;

        if (selectedModule === "ALL") return true;
        return perm.module.toLowerCase() === selectedModule.toLowerCase();
      });
  }, [allPermissions, searchQuery, selectedModule]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedModule]);

  // Pagination slice
  const totalPermissionsCount = filteredPermissions.length;
  const totalPages = Math.ceil(totalPermissionsCount / pageSize) || 1;
  const paginatedPermissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, currentPage, pageSize]);

  // Roles map
  const superAdminRole = rolesData.find(
    (r) => r.role === "super_admin" || r.id === "super_admin"
  );
  const adminRole = rolesData.find(
    (r) => r.role === "administrator" || r.id === "administrator"
  );
  const employeeRole = rolesData.find(
    (r) => r.role === "employee" || r.id === "employee"
  );

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast.success(`Copied: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Mock Create Role Action
  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      showToast.error("Please provide a valid role name.");
      return;
    }
    showToast.success(`Role "${newRoleName.trim()}" created successfully.`);
    setCreateRoleModalOpen(false);
    setNewRoleName("");
    setNewRoleDesc("");
  };

  // Loading Role Screen
  if (loadingRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0879D9]" />
      </div>
    );
  }

  // Access Denied Screen
  if (!currentRole || !can(currentRole, "roles.view")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <ShieldAlert size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#07365A] dark:text-white">
          Access Restricted
        </h2>
        <p className="mt-2 text-sm text-[#66829A] dark:text-[#8CB0C7]">
          You do not have permission to view roles and security permission
          matrices. Only authorized Super Administrators may inspect role
          policies.
        </p>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#052F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const startEntry =
    totalPermissionsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalPermissionsCount);

  return (
    <div className="min-h-screen bg-[#F5F9FC] text-[#07365A] dark:bg-[#071F2C] dark:text-white">
      <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* =================================================
            1. NAVIGATION BREADCRUMB & HEADER
        ================================================= */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0879D9] hover:underline dark:text-[#00C2E8]"
          >
            <ArrowLeft size={14} />
            <span>Back to Management</span>
          </button>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white sm:text-3xl">
                Roles & Permissions
              </h1>

              {/* Super Admin RBAC Matrix Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-bold text-[#B45309] dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
                <Crown size={13} className="text-[#D97706]" />
                Super Admin RBAC Matrix
              </span>
            </div>

            <p className="mt-1 text-xs text-[#66829A] dark:text-[#8CB0C7] sm:text-sm">
              Manage system roles, inspect permissions, and control access levels
              across all modules.
            </p>
          </div>

          {/* Top-Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:self-center">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#D8E4EC] bg-white px-4 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
            >
              <Upload size={14} />
              <span>Import Roles</span>
            </button>

            <button
              type="button"
              onClick={() => setCreateRoleModalOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#063B61] px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#052F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]"
            >
              <Plus size={15} />
              <span>Create Role</span>
            </button>
          </div>
        </div>

        {/* =================================================
            2. 4 ROLE OVERVIEW CARDS (120–130px)
        ================================================= */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Super Administrator */}
          <div
            onClick={() => setSelectedRoleKey("super_admin")}
            className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition min-h-[125px] flex flex-col justify-between ${
              selectedRoleKey === "super_admin"
                ? "border-[#00A6C7] bg-[#F0FAFD] ring-2 ring-[#00A6C7]/20 dark:border-[#00C2E8] dark:bg-[#0E3248] dark:ring-[#00C2E8]/20"
                : "border-[#D8E4EC] bg-white hover:border-[#00A6C7]/50 dark:border-[#1E435E] dark:bg-[#0B2538] dark:hover:border-[#00C2E8]/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706] dark:bg-[#382810] dark:text-[#FBBF24]">
                  <Crown size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#07365A] dark:text-white">
                    Super Administrator
                  </h3>
                  <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                    Full access to all modules and settings
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-[#EDF3F7] pt-2 text-[11px] dark:border-[#1E435E]">
              <div className="flex items-center gap-2 font-medium text-[#07365A] dark:text-[#C7D9DF]">
                <span>
                  {superAdminRole?.permissions?.length || allPermissions.length || 29} Permissions
                </span>
                <span className="text-[#66829A]">•</span>
                <span>5 Admins</span>
              </div>
              <span className="rounded-md border border-[#86EFAC]/50 bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-bold text-[#0E9F6E] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                Highest Access
              </span>
            </div>
          </div>

          {/* Card 2: Administrator */}
          <div
            onClick={() => setSelectedRoleKey("administrator")}
            className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition min-h-[125px] flex flex-col justify-between ${
              selectedRoleKey === "administrator"
                ? "border-[#00A6C7] bg-[#F0FAFD] ring-2 ring-[#00A6C7]/20 dark:border-[#00C2E8] dark:bg-[#0E3248] dark:ring-[#00C2E8]/20"
                : "border-[#D8E4EC] bg-white hover:border-[#00A6C7]/50 dark:border-[#1E435E] dark:bg-[#0B2538] dark:hover:border-[#00C2E8]/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#07365A] dark:text-white">
                    Administrator
                  </h3>
                  <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                    Manage organization operations
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-[#EDF3F7] pt-2 text-[11px] dark:border-[#1E435E]">
              <div className="flex items-center gap-2 font-medium text-[#07365A] dark:text-[#C7D9DF]">
                <span>
                  {adminRole?.permissions?.length || 18} Permissions
                </span>
                <span className="text-[#66829A]">•</span>
                <span>12 Users</span>
              </div>
              <span className="rounded-md border border-[#93C5FD]/50 bg-[#EBF5FA] px-2 py-0.5 text-[10px] font-bold text-[#1C64F2] dark:bg-[#103248] dark:text-[#60A5FA]">
                High Access
              </span>
            </div>
          </div>

          {/* Card 3: Employee */}
          <div
            onClick={() => setSelectedRoleKey("employee")}
            className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition min-h-[125px] flex flex-col justify-between ${
              selectedRoleKey === "employee"
                ? "border-[#00A6C7] bg-[#F0FAFD] ring-2 ring-[#00A6C7]/20 dark:border-[#00C2E8] dark:bg-[#0E3248] dark:ring-[#00C2E8]/20"
                : "border-[#D8E4EC] bg-white hover:border-[#00A6C7]/50 dark:border-[#1E435E] dark:bg-[#0B2538] dark:hover:border-[#00C2E8]/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F8F0] text-[#10B981] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                  <UserRound size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#07365A] dark:text-white">
                    Employee
                  </h3>
                  <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                    Standard access for daily operations
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-[#EDF3F7] pt-2 text-[11px] dark:border-[#1E435E]">
              <div className="flex items-center gap-2 font-medium text-[#07365A] dark:text-[#C7D9DF]">
                <span>
                  {employeeRole?.permissions?.length || 5} Permissions
                </span>
                <span className="text-[#66829A]">•</span>
                <span>120 Users</span>
              </div>
              <span className="rounded-md border border-[#86EFAC]/50 bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-bold text-[#0E9F6E] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                Standard Access
              </span>
            </div>
          </div>

          {/* Card 4: Custom Roles */}
          <div
            onClick={() => setSelectedRoleKey("custom_roles")}
            className={`cursor-pointer rounded-2xl border p-4 shadow-2xs transition min-h-[125px] flex flex-col justify-between ${
              selectedRoleKey === "custom_roles"
                ? "border-[#00A6C7] bg-[#F0FAFD] ring-2 ring-[#00A6C7]/20 dark:border-[#00C2E8] dark:bg-[#0E3248] dark:ring-[#00C2E8]/20"
                : "border-[#D8E4EC] bg-white hover:border-[#00A6C7]/50 dark:border-[#1E435E] dark:bg-[#0B2538] dark:hover:border-[#00C2E8]/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#9333EA] dark:bg-[#2A1E4A] dark:text-[#A78BFA]">
                  <UsersRound size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#07365A] dark:text-white">
                    Custom Roles
                  </h3>
                  <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                    Role with specific permissions
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between border-t border-[#EDF3F7] pt-2 text-[11px] dark:border-[#1E435E]">
              <div className="flex items-center gap-2 font-medium text-[#07365A] dark:text-[#C7D9DF]">
                <span>8 Custom Roles</span>
                <span className="text-[#66829A]">•</span>
                <span>36 Users</span>
              </div>
              <span className="rounded-md border border-[#DDD6FE]/50 bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-bold text-[#9333EA] dark:bg-[#2A1E4A] dark:text-[#A78BFA]">
                Flexible Access
              </span>
            </div>
          </div>
        </div>

        {/* =================================================
            3. TOOLBAR: TABS + SEARCH & MODULE FILTER
        ================================================= */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Tabs */}
          <div className="flex items-center gap-1 border-b border-[#D8E4EC] pb-1 dark:border-[#1E435E]">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "matrix"
                  ? "border-[#00A6C7] text-[#07365A] dark:border-[#00C2E8] dark:text-white"
                  : "border-transparent text-[#66829A] hover:text-[#07365A] dark:text-[#8CB0C7] dark:hover:text-white"
              }`}
            >
              <LayoutGrid size={15} />
              <span>Permissions Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("roles")}
              className={`inline-flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "roles"
                  ? "border-[#00A6C7] text-[#07365A] dark:border-[#00C2E8] dark:text-white"
                  : "border-transparent text-[#66829A] hover:text-[#07365A] dark:text-[#8CB0C7] dark:hover:text-white"
              }`}
            >
              <Users size={15} />
              <span>Role Management</span>
            </button>
          </div>

          {/* Right: Search & Module Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input (~360px) */}
            <div className="relative w-full sm:w-[320px] lg:w-[360px]">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8CB0C7]"
              />
              <input
                type="text"
                placeholder="Search permissions (e.g. employees.create, reports.view)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#D8E4EC] bg-white pl-10 pr-4 text-xs font-medium text-[#07365A] outline-none placeholder:text-[#718894] focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:placeholder:text-[#8CB0C7]"
              />
            </div>

            {/* Module Filter Dropdown (~150px) */}
            <div className="relative w-[150px]">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-[#D8E4EC] bg-white pl-3.5 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
              >
                <option value="ALL">All Modules</option>
                {availableModules.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8CB0C7]"
              />
            </div>

            {/* Filters Button (~90px) */}
            <button
              type="button"
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`inline-flex h-10 w-[90px] items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition ${
                showFiltersDrawer
                  ? "border-[#0879D9] bg-[#EAF5FC] text-[#0879D9] dark:border-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"
                  : "border-[#D8E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
              }`}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Info Drawer */}
        {showFiltersDrawer && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D8E4EC] bg-white p-3 text-xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-center gap-2 text-[#66829A] dark:text-[#8CB0C7]">
              <Info size={14} />
              <span>
                Filtering by module:{" "}
                <strong className="text-[#07365A] dark:text-white">
                  {selectedModule === "ALL" ? "All Modules" : selectedModule}
                </strong>
                {searchQuery && ` • query: "${searchQuery}"`}
              </span>
            </div>

            {(selectedModule !== "ALL" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedModule("ALL");
                  setSearchQuery("");
                }}
                className="font-semibold text-[#E5484D] hover:underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchRolesAndPermissions}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white shadow-xs transition hover:bg-rose-700"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* =================================================
            4. MAIN PERMISSION MATRIX CARD
        ================================================= */}
        {activeTab === "matrix" && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            {/* Card Header & Legend */}
            <div className="flex flex-col justify-between gap-3 border-b border-[#D8E4EC] px-6 py-4.5 dark:border-[#1E435E] sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-[#07365A] dark:text-white sm:text-lg">
                  Module Permissions
                </h2>
                <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                  View and manage granular permissions for each role across all
                  system modules.
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-[#0E9F6E] dark:text-[#31C48D]">
                  <CheckCircle2 size={15} />
                  <span>Granted</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#E5484D] dark:text-[#F87171]">
                  <XCircle size={15} />
                  <span>Denied</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#F59E0B] dark:text-[#FBBF24]">
                  <MinusCircle size={15} />
                  <span>Partial</span>
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0879D9]" />
              </div>
            ) : paginatedPermissions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-base font-bold text-[#07365A] dark:text-white">
                  No permissions found
                </p>
                <p className="mt-1 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                  Try changing your search query or module filter.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto responsive-table-scroll">
                <table className="enterprise-table w-full min-w-[800px] text-left border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
                  {/* Sticky Table Header */}
                  <thead className="sticky top-0 z-10 border-b border-[#D8DEE8] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8CB0C7]">
                    <tr className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                      <th className="w-[280px] px-6 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">PERMISSION</th>
                      <th className="w-[180px] px-6 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">MODULE</th>
                      <th className="px-6 py-3.5 text-center border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                        <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <Crown size={14} className="text-[#D97706]" />
                          Super Administrator
                        </span>
                      </th>
                      <th className="px-6 py-3.5 text-center border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                        <span className="inline-flex items-center gap-1.5 text-[#0879D9] dark:text-[#00C2E8]">
                          <ShieldCheck size={14} className="text-[#0879D9]" />
                          Administrator
                        </span>
                      </th>
                      <th className="px-6 py-3.5 text-center border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                        <span className="inline-flex items-center gap-1.5 text-[#10B981] dark:text-[#31C48D]">
                          <UserRound size={14} className="text-[#10B981]" />
                          Employee
                        </span>
                      </th>
                      <th className="w-[60px] px-4 py-3.5 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">ACTIONS</th>
                    </tr>
                  </thead>

                  {/* Table Body (58–64px Rows) */}
                  <tbody className="divide-y divide-[#E5E7EB] bg-white text-xs dark:divide-[#18333F] dark:bg-[#0B202B]">
                    {paginatedPermissions.map((perm) => {
                      const modStyle = getModuleBadgeStyle(perm.module);
                      const ModIcon = modStyle.icon;

                      // Check role access
                      const hasSuper = true; // Super Administrator has unrestricted access
                      const hasAdmin =
                        adminRole?.permissions?.includes(perm.key) ?? false;
                      const hasEmployee =
                        employeeRole?.permissions?.includes(perm.key) ?? false;

                      return (
                        <tr
                          key={perm.key}
                          className="transition hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
                        >
                          {/* 1. Permission Key + Description */}
                          <td className="px-6 py-3.5">
                            <div className="font-mono text-xs font-bold text-[#07365A] dark:text-white">
                              {perm.label}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                              {perm.description}
                            </div>
                          </td>

                          {/* 2. Module Badge */}
                          <td className="px-6 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${modStyle.bg}`}
                            >
                              <ModIcon size={12} />
                              <span>{perm.module}</span>
                            </span>
                          </td>

                          {/* 3. Super Administrator */}
                          <td className="px-6 py-3.5 text-center">
                            {hasSuper ? (
                              <span
                                title="Granted"
                                className="inline-flex items-center justify-center text-[#10B981] dark:text-[#31C48D]"
                              >
                                <CheckCircle2 size={18} />
                              </span>
                            ) : (
                              <span
                                title="Denied"
                                className="inline-flex items-center justify-center text-[#EF4444] dark:text-[#F87171]"
                              >
                                <XCircle size={18} />
                              </span>
                            )}
                          </td>

                          {/* 4. Administrator */}
                          <td className="px-6 py-3.5 text-center">
                            {hasAdmin ? (
                              <span
                                title="Granted"
                                className="inline-flex items-center justify-center text-[#10B981] dark:text-[#31C48D]"
                              >
                                <CheckCircle2 size={18} />
                              </span>
                            ) : (
                              <span
                                title="Denied"
                                className="inline-flex items-center justify-center text-[#EF4444] dark:text-[#F87171]"
                              >
                                <XCircle size={18} />
                              </span>
                            )}
                          </td>

                          {/* 5. Employee */}
                          <td className="px-6 py-3.5 text-center">
                            {hasEmployee ? (
                              <span
                                title="Granted"
                                className="inline-flex items-center justify-center text-[#10B981] dark:text-[#31C48D]"
                              >
                                <CheckCircle2 size={18} />
                              </span>
                            ) : (
                              <span
                                title="Denied"
                                className="inline-flex items-center justify-center text-[#EF4444] dark:text-[#F87171]"
                              >
                                <XCircle size={18} />
                              </span>
                            )}
                          </td>

                          {/* 6. Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setDetailModalPermission(perm)}
                              title="Permission options"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D8E4EC] bg-white text-[#66829A] shadow-2xs transition hover:bg-[#F8FBFC] hover:text-[#07365A] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#122D42] dark:hover:text-white"
                            >
                              <MoreVertical size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Bar */}
            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#D8E4EC] px-6 py-4 dark:border-[#1E435E] sm:flex-row">
              {/* Summary */}
              <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                Showing <span className="font-bold text-[#07365A] dark:text-white">{startEntry}</span>{" "}
                – <span className="font-bold text-[#07365A] dark:text-white">{endEntry}</span> of{" "}
                <span className="font-bold text-[#07365A] dark:text-white">{totalPermissionsCount}</span>{" "}
                permissions
              </p>

              {/* Page Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8E4EC] bg-white px-3 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                    <span>Previous</span>
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => {
                    const isActive = p === currentPage;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                          isActive
                            ? "bg-[#063B61] text-white dark:bg-[#0879D9]"
                            : "border border-[#D8E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  {currentPage > 5 && currentPage < totalPages && (
                    <>
                      <span className="px-1 text-xs text-[#66829A]">…</span>
                      <button
                        type="button"
                        className="h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold bg-[#063B61] text-white dark:bg-[#0879D9]"
                      >
                        {currentPage}
                      </button>
                    </>
                  )}

                  {totalPages > 5 && (
                    <>
                      <span className="px-1 text-xs text-[#66829A]">…</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                          currentPage === totalPages
                            ? "bg-[#063B61] text-white dark:bg-[#0879D9]"
                            : "border border-[#D8E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D8E4EC] bg-white px-3 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <GoToPage
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            5. TAB 2: ROLE MANAGEMENT VIEW
        ================================================= */}
        {activeTab === "roles" && (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-[#D8E4EC] bg-white p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
              <div className="flex items-center justify-between pb-4 border-b border-[#D8E4EC] dark:border-[#1E435E]">
                <div>
                  <h2 className="text-base font-bold text-[#07365A] dark:text-white sm:text-lg">
                    System Role Management
                  </h2>
                  <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
                    Manage access tiers, examine role permissions, and provision custom roles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateRoleModalOpen(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#063B61] px-4 text-xs font-semibold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
                >
                  <Plus size={14} />
                  <span>Add Role</span>
                </button>
              </div>

              {/* Roles List */}
              <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {rolesData.map((role) => (
                  <div
                    key={role.role}
                    className="rounded-xl border border-[#D8E4EC] bg-[#F8FBFC] p-4 dark:border-[#1E435E] dark:bg-[#0D2430]"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#07365A] dark:text-white">
                        {role.label}
                      </h3>
                      <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-[#0879D9] border border-[#D8E4EC] dark:bg-[#0B2538] dark:border-[#1E435E]">
                        {role.permissionsCount} perms
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#66829A] dark:text-[#8CB0C7] line-clamp-2">
                      {role.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-[#EDF3F7] pt-3 text-xs dark:border-[#1E435E]">
                      <span className="font-mono text-[11px] text-[#66829A]">
                        id: {role.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRoleKey(role.role);
                          setActiveTab("matrix");
                        }}
                        className="font-semibold text-[#0879D9] hover:underline dark:text-[#00C2E8]"
                      >
                        Inspect Matrix →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            6. ENTERPRISE FOOTER
        ================================================= */}
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#D8E4EC] py-5 text-xs text-[#718894] dark:border-[#1E435E] dark:text-[#8CB0C7] sm:flex-row">
          <p>© 2026 MindMatrix. Workforce Management. All rights reserved.</p>

          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-[#0E9F6E]" />
            <span>Secure administrative environment</span>
          </div>
        </footer>
      </div>

      {/* =================================================
          7. CREATE ROLE MODAL
      ================================================= */}
      <Modal
        isOpen={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        className="w-full max-w-md"
      >
        <div className="w-full overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex items-center justify-between border-b border-[#EDF3F7] px-6 py-4 dark:border-[#1E435E]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                <UserCog size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#07365A] dark:text-white">
                  Create System Role
                </h3>
                <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                  Define access level and permission bindings
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCreateRoleModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreateRoleSubmit} className="p-6 space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                Role Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Compliance Auditor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#D8E4EC] bg-white px-3.5 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Summarize the purpose of this custom role..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#D8E4EC] bg-white p-3 text-xs text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                Base Permission Template
              </label>
              <select
                value={newRoleBase}
                onChange={(e) => setNewRoleBase(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[#D8E4EC] bg-white px-3 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
              >
                <option value="employee">Clone from Employee (Standard Access)</option>
                <option value="administrator">Clone from Administrator (High Access)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EDF3F7] dark:border-[#1E435E]">
              <button
                type="button"
                onClick={() => setCreateRoleModalOpen(false)}
                className="rounded-xl border border-[#D8E4EC] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
              >
                Create Role
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* =================================================
          8. IMPORT ROLES MODAL
      ================================================= */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        className="w-full max-w-md"
      >
        <div className="w-full overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
          <div className="flex items-center justify-between border-b border-[#EDF3F7] px-6 py-4 dark:border-[#1E435E]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                <Upload size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#07365A] dark:text-white">
                  Import RBAC Roles
                </h3>
                <p className="text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                  Upload custom role definitions in JSON format
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setImportModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D8E4EC] p-6 text-center dark:border-[#1E435E]">
              <FileCode size={32} className="text-[#0879D9]" />
              <p className="mt-2 text-xs font-semibold text-[#07365A] dark:text-white">
                Drop role policy JSON file here
              </p>
              <p className="mt-1 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                Supports MindMatrix RBAC schema (.json)
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EDF3F7] dark:border-[#1E435E]">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-xl border border-[#D8E4EC] bg-white px-4 py-2 text-xs font-semibold text-[#536B77] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#C7D9DF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast.success("RBAC template imported successfully.");
                  setImportModalOpen(false);
                }}
                className="rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
              >
                Import File
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* =================================================
          9. PERMISSION DETAILS MODAL
      ================================================= */}
      <Modal
        isOpen={!!detailModalPermission}
        onClose={() => setDetailModalPermission(null)}
        className="w-full max-w-md"
      >
        {detailModalPermission && (
          <div className="w-full overflow-hidden rounded-2xl border border-[#D8E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex items-center justify-between border-b border-[#EDF3F7] px-6 py-4 dark:border-[#1E435E]">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#07365A] dark:text-white">
                    Permission Details
                  </h3>
                  <p className="text-[11px] font-mono text-[#66829A] dark:text-[#8CB0C7]">
                    {detailModalPermission.key}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalPermission(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#66829A] hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="rounded-xl border border-[#D8E4EC] bg-[#F8FBFC] p-3 dark:border-[#1E435E] dark:bg-[#0D2430]">
                <span className="font-semibold text-[#718894] dark:text-[#8CB0C7]">
                  Module Classification
                </span>
                <p className="mt-1 font-bold text-[#07365A] dark:text-white">
                  {detailModalPermission.module}
                </p>
              </div>

              <div className="rounded-xl border border-[#D8E4EC] bg-[#F8FBFC] p-3 dark:border-[#1E435E] dark:bg-[#0D2430]">
                <span className="font-semibold text-[#718894] dark:text-[#8CB0C7]">
                  Description
                </span>
                <p className="mt-1 text-[#07365A] dark:text-white">
                  {detailModalPermission.description}
                </p>
              </div>

              <div className="rounded-xl border border-[#D8E4EC] bg-[#F8FBFC] p-3 dark:border-[#1E435E] dark:bg-[#0D2430]">
                <span className="font-semibold text-[#718894] dark:text-[#8CB0C7]">
                  Identifier
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#0879D9] dark:text-[#00C2E8]">
                    {detailModalPermission.key}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(detailModalPermission.key)}
                    className="inline-flex items-center gap-1 font-bold text-[#07365A] hover:underline dark:text-white"
                  >
                    <Copy size={12} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EDF3F7] dark:border-[#1E435E]">
                <button
                  type="button"
                  onClick={() => setDetailModalPermission(null)}
                  className="rounded-xl bg-[#063B61] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#052F4D] dark:bg-[#0879D9]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
