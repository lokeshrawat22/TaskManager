import User from "../models/user.model.js";

// =====================================================
// AUTHORITATIVE WORKFORCE ROLES DEFINITION
// =====================================================

export const ALL_EMPLOYEE_ROLES = [
  "employee",
  "user",
  "administrator",
  "super_admin",
  "admin",
] as const;

export type EmployeeRole = typeof ALL_EMPLOYEE_ROLES[number];

/**
 * Returns a MongoDB query filter scoped to all organization employees/members.
 */
export const getEmployeeRoleFilter = (
  extraFilter: Record<string, any> = {},
): Record<string, any> => {
  return {
    role: { $in: ALL_EMPLOYEE_ROLES },
    ...extraFilter,
  };
};

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
}

/**
 * Single source of truth for organization employee counts.
 * Guaranteed: totalEmployees = activeEmployees + inactiveEmployees
 */
export const getEmployeeStats = async (
  extraFilter: Record<string, any> = {},
): Promise<EmployeeStats> => {
  const baseFilter = getEmployeeRoleFilter(extraFilter);

  const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
    User.countDocuments(baseFilter),
    User.countDocuments({
      ...baseFilter,
      isBlocked: { $ne: true },
    }),
    User.countDocuments({
      ...baseFilter,
      isBlocked: true,
    }),
  ]);

  return {
    totalEmployees,
    activeEmployees,
    inactiveEmployees,
  };
};
