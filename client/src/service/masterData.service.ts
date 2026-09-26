import { apiRequest } from "./api.service";

export interface DepartmentMaster {
  _id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  employeeCount?: number;
  designationCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DesignationMaster {
  _id: string;
  name: string;
  description?: string;
  status: "ACTIVE" | "INACTIVE";
  department?: {
    _id: string;
    name: string;
    status?: string;
  } | string;
  departmentName?: string;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface MasterDataResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  message?: string;
}

// In-memory module-level cache
let departmentsCache: { key: string; data: DepartmentMaster[]; timestamp: number } | null = null;
const designationsCache = new Map<string, { data: DesignationMaster[]; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Fetch departments from centralized API
 */
export async function fetchDepartments(options?: {
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  search?: string;
  forceFresh?: boolean;
}): Promise<DepartmentMaster[]> {
  const statusParam = options?.status && options.status !== "ALL" ? options.status : options?.status === "ALL" ? "" : "ACTIVE";
  const searchParam = options?.search?.trim() || "";

  const cacheKey = `dept:${statusParam}:${searchParam}`;
  const now = Date.now();

  if (!options?.forceFresh && departmentsCache && departmentsCache.key === cacheKey && now - departmentsCache.timestamp < CACHE_TTL) {
    return departmentsCache.data;
  }

  const query = new URLSearchParams();
  if (statusParam) query.set("status", statusParam);
  if (searchParam) query.set("search", searchParam);

  const queryString = query.toString();
  const endpoint = `/api/admin/departments${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await apiRequest<MasterDataResponse<DepartmentMaster>>(endpoint, {
      method: "GET",
    });

    const list = Array.isArray(res?.data) ? res.data : [];
    departmentsCache = { key: cacheKey, data: list, timestamp: now };
    return list;
  } catch (error) {
    console.error("[masterData.service] fetchDepartments error:", error);
    if (departmentsCache?.data) return departmentsCache.data;
    throw error;
  }
}

/**
 * Fetch designations from centralized API
 */
export async function fetchDesignations(options?: {
  department?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  search?: string;
  forceFresh?: boolean;
}): Promise<DesignationMaster[]> {
  const deptParam = options?.department?.trim() || "";
  const statusParam = options?.status && options.status !== "ALL" ? options.status : options?.status === "ALL" ? "" : "ACTIVE";
  const searchParam = options?.search?.trim() || "";

  const cacheKey = `desig:${deptParam}:${statusParam}:${searchParam}`;
  const now = Date.now();

  const cached = designationsCache.get(cacheKey);
  if (!options?.forceFresh && cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const query = new URLSearchParams();
  if (deptParam && deptParam !== "ALL") query.set("department", deptParam);
  if (statusParam) query.set("status", statusParam);
  if (searchParam) query.set("search", searchParam);

  const queryString = query.toString();
  const endpoint = `/api/admin/designations${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await apiRequest<MasterDataResponse<DesignationMaster>>(endpoint, {
      method: "GET",
    });

    const list = Array.isArray(res?.data) ? res.data : [];
    designationsCache.set(cacheKey, { data: list, timestamp: now });
    return list;
  } catch (error) {
    console.error("[masterData.service] fetchDesignations error:", error);
    if (cached?.data) return cached.data;
    throw error;
  }
}

/**
 * Invalidate cached master data and notify all mounted subscriber hooks
 */
export function invalidateMasterData(target: "departments" | "designations" | "all" = "all") {
  if (target === "departments" || target === "all") {
    departmentsCache = null;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("masterdata:departments:invalidate"));
    }
  }

  if (target === "designations" || target === "all") {
    designationsCache.clear();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("masterdata:designations:invalidate"));
    }
  }
}
