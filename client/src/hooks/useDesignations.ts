"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DesignationMaster, fetchDesignations } from "@/service/masterData.service";

interface UseDesignationsOptions {
  department?: string;
  status?: "ACTIVE" | "INACTIVE" | "ALL";
  search?: string;
  autoFetch?: boolean;
}

export function useDesignations(options?: UseDesignationsOptions) {
  const department = options?.department ?? "";
  const status = options?.status ?? "ACTIVE";
  const search = options?.search ?? "";
  const autoFetch = options?.autoFetch ?? true;

  const [designations, setDesignations] = useState<DesignationMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string>("");

  const load = useCallback(
    async (forceFresh = false) => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchDesignations({
          department,
          status,
          search,
          forceFresh,
        });
        setDesignations(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load designations.");
      } finally {
        setLoading(false);
      }
    },
    [department, status, search]
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
      window.addEventListener("masterdata:designations:invalidate", handleInvalidate);
      return () => {
        window.removeEventListener("masterdata:designations:invalidate", handleInvalidate);
      };
    }
  }, [load]);

  const designationNames = useMemo(() => designations.map((d) => d.name), [designations]);

  return {
    designations,
    designationNames,
    loading,
    error,
    refetch: () => load(true),
  };
}
