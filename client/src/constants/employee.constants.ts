/**
 * @deprecated
 * DEPRECATED: Do not use hardcoded lists for dropdowns, forms, or filters.
 * Use centralized master data hooks instead:
 * - `useDepartments()` from `@/hooks/useDepartments`
 * - `useDesignations()` from `@/hooks/useDesignations`
 *
 * This static map is maintained only as a secondary fallback.
 */
export const DEPARTMENT_DESIGNATION_MAP: Record<string, string[]> = {
  Engineering: [
    "Software Engineer",
    "Senior Software Engineer",
    "Team Lead",
    "Engineering Manager",
  ],
  HR: [
    "HR Executive",
    "HR Manager"
  ],
  Finance: [
    "Accountant",
    "Finance Manager"
  ],
  Sales: [
    "Sales Executive",
    "Sales Manager"
  ],
  Marketing: [
    "Marketing Executive",
    "Marketing Manager"
  ],
  Operations: [
    "Operations Executive",
    "Operations Manager",
    "Office Manager",
  ],
  IT: [
    "IT Support Specialist",
    "System Administrator",
    "IT Manager"
  ],
};

export const DEPARTMENTS = Object.keys(DEPARTMENT_DESIGNATION_MAP);
