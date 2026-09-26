// =====================================================
// CANONICAL ROLES
// =====================================================

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMINISTRATOR: "administrator",
  EMPLOYEE: "employee",
} as const;

export type CanonicalRole = typeof ROLES[keyof typeof ROLES];

export type UserRole =
  | "super_admin"
  | "administrator"
  | "admin"
  | "employee"
  | "user";

export type Role = CanonicalRole | UserRole | string;

// =====================================================
// CANONICAL DISPLAY LABELS
// =====================================================

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Administrator",
  superadmin: "Super Administrator",
  super_administrator: "Super Administrator",
  superadministrator: "Super Administrator",
  administrator: "Administrator",
  admin: "Administrator",
  employee: "Employee",
  user: "Employee",
};

export const getRoleLabel = (role?: string, t?: (key: string) => string): string => {
  if (!role) return t ? t("roles.employee") : "Employee";
  const normalized = role.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (t) {
    if (normalized.includes("super")) return t("roles.super_admin");
    if (normalized.includes("admin")) return t("roles.administrator");
    if (normalized.includes("employee") || normalized.includes("user")) return t("roles.employee");
  }
  return ROLE_LABELS[normalized] || role;
};

// =====================================================
// NORMALIZE ROLE HELPER
// =====================================================

export const normalizeRole = (role?: string): CanonicalRole => {
  if (!role) return ROLES.EMPLOYEE;
  const lower = role.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (
    lower === "super_admin" ||
    lower === "superadmin" ||
    lower === "super_administrator" ||
    lower === "superadministrator"
  ) {
    return ROLES.SUPER_ADMIN;
  }
  if (lower === "admin" || lower === "administrator") {
    return ROLES.ADMINISTRATOR;
  }
  return ROLES.EMPLOYEE;
};

// =====================================================
// PERMISSIONS DEFINITIONS
// =====================================================

export const PERMISSIONS = {
  // Employees
  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_EDIT: "employees.edit",
  EMPLOYEES_DEACTIVATE: "employees.deactivate",

  // Tasks
  TASKS_VIEW: "tasks.view",
  TASKS_CREATE: "tasks.create",
  TASKS_EDIT: "tasks.edit",
  TASKS_DELETE: "tasks.delete",
  TASKS_ASSIGN: "tasks.assign",

  // Departments
  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_MANAGE: "departments.manage",

  // Designations
  DESIGNATIONS_VIEW: "designations.view",
  DESIGNATIONS_MANAGE: "designations.manage",

  // Administrators (Super Admin only)
  ADMINISTRATORS_VIEW: "administrators.view",
  ADMINISTRATORS_CREATE: "administrators.create",
  ADMINISTRATORS_EDIT: "administrators.edit",
  ADMINISTRATORS_DEACTIVATE: "administrators.deactivate",
  ADMINISTRATORS_DELETE: "administrators.delete",

  // Roles & Permissions (Super Admin only)
  ROLES_VIEW: "roles.view",
  ROLES_MANAGE: "roles.manage",
  PERMISSIONS_VIEW: "permissions.view",
  PERMISSIONS_MANAGE: "permissions.manage",

  // Reports & Exports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  EXPORTS_CREATE: "exports.create",

  // Notifications
  NOTIFICATIONS_VIEW: "notifications.view",
  NOTIFICATIONS_MANAGE: "notifications.manage",

  // Audit Logs (Super Admin only)
  AUDIT_LOGS_VIEW: "audit_logs.view",

  // System Settings (Super Admin only)
  SYSTEM_SETTINGS_MANAGE: "system.settings.manage",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// =====================================================
// ROLE TO PERMISSIONS MAP
// =====================================================

export const ROLE_PERMISSIONS: Record<CanonicalRole, Permission[]> = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.EMPLOYEES_VIEW,
    PERMISSIONS.EMPLOYEES_CREATE,
    PERMISSIONS.EMPLOYEES_EDIT,
    PERMISSIONS.EMPLOYEES_DEACTIVATE,

    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_CREATE,
    PERMISSIONS.TASKS_EDIT,
    PERMISSIONS.TASKS_DELETE,
    PERMISSIONS.TASKS_ASSIGN,

    PERMISSIONS.DEPARTMENTS_VIEW,
    PERMISSIONS.DEPARTMENTS_MANAGE,

    PERMISSIONS.DESIGNATIONS_VIEW,
    PERMISSIONS.DESIGNATIONS_MANAGE,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.EXPORTS_CREATE,

    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ],

  [ROLES.EMPLOYEE]: [
    PERMISSIONS.TASKS_VIEW,
    PERMISSIONS.TASKS_EDIT,
    PERMISSIONS.EXPORTS_CREATE,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_MANAGE,
  ],
};

// =====================================================
// CLIENT AUTHORIZATION HELPERS
// =====================================================

export const hasPermission = (
  role: string | undefined,
  permission: Permission
): boolean => {
  const canonical = normalizeRole(role);
  if (canonical === ROLES.SUPER_ADMIN) return true;
  const permissions = ROLE_PERMISSIONS[canonical] || [];
  return permissions.includes(permission);
};

export const can = (
  userOrRole: { role?: string } | string | undefined | null,
  permission: Permission
): boolean => {
  if (!userOrRole) return false;
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role;
  return hasPermission(role, permission);
};
