"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DepartmentMaster, fetchDepartments } from "@/service/masterData.service";

interface UseDepartmentsOptions {
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  search?: string;
  autoFetch?: boolean;
}

export function useDepartments(options?: UseDepartmentsOptions) {
  const status = options?.status ?? "ACTIVE";
  const search = options?.search ?? "";
  const autoFetch = options?.autoFetch ?? true;

  const [departments, setDepartments] = useState<DepartmentMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string>("");

  const load = useCallback(
    async (forceFresh = false) => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchDepartments({ status, search, forceFresh });
        setDepartments(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load departments.");
      } finally {
        setLoading(false);
      }
    },
    [status, search]
  );

  useEffect(() => {
    if (autoFetch) {
      load();
    }
  }, [load, autoFetch]);

  // Subscribe to real-time / master data invalidation events
  useEffect(() => {
    const handleInvalidate = () => {
      load(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("masterdata:departments:invalidate", handleInvalidate);
      return () => {
        window.removeEventListener("masterdata:departments:invalidate", handleInvalidate);
      };
    }
  }, [load]);

  const departmentNames = useMemo(() => departments.map((d) => d.name), [departments]);

  return {
    departments,
    departmentNames,
    loading,
    error,
    refetch: () => load(true),
  };
}
