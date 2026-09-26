"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Download,
  Eye,
  FileCode,
  FileText,
  Filter,
  Layers,
  Loader2,
  MoreVertical,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
  XCircle,
} from "lucide-react";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import { can, getRoleLabel, Role } from "@/constants/rbac";
import { AuditLogDetailModal } from "./AuditLogDetailModal";
import { useAuth } from "@/context/AuthContext";
import { GoToPage } from "@/components/ui/GoToPage";

// =====================================================
// TYPES
// =====================================================

interface AuditLog {
  _id: string;
  eventType: string;
  action?: string;
  resource?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  role?: string;
  ip?: string;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILURE" | "DENIED" | "BLOCKED" | "INFO" | "WARNING";
  statusCode?: number;
  method?: string;
  endpoint?: string;
  details?: Record<string, any>;
  errorMessage?: string;
  timestamp: string;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ProfileResponse {
  success: boolean;
  data?: { role: Role };
  user?: { role: Role };
}

// =====================================================
// HELPERS
// =====================================================

function formatEventCode(eventType: string) {
  return eventType || "SYSTEM_EVENT";
}

function formatEventAction(log: AuditLog, language: string): string {
  if (log.action && log.action.trim()) return log.action;

  const event = (log.eventType || "").toUpperCase();

  switch (event) {
    case "AUTH_LOGIN_FAILED":
      return language === "hi" ? "लॉगिन प्रयास विफल" : "Failed login attempt";
    case "ROLE_CHANGED":
      return language === "hi" ? "उपयोगकर्ता भूमिका अद्यतन की गई" : "User role updated";
    case "AUTH_LOGIN_SUCCESS":
      return language === "hi" ? "उपयोगकर्ता ने लॉगिन किया" : "User logged in";
    case "AUTH_LOGOUT":
      return language === "hi" ? "उपयोगकर्ता ने लॉगआउट किया" : "User logged out";
    case "PASSWORD_RESET":
      return language === "hi" ? "पासवर्ड रीसेट का अनुरोध किया गया" : "Password reset requested";
    case "PERMISSION_UPDATED":
      return language === "hi" ? "अनुमतियाँ संशोधित की गईं" : "Permissions modified";
    case "DEPARTMENT_UPDATED":
      return language === "hi" ? "विभाग विवरण बदला गया" : "Department details changed";
    case "ACCOUNT_LOCKED":
    case "AUTH_ACCOUNT_LOCKED":
      return language === "hi" ? "अनेक प्रयासों के कारण खाता लॉक किया गया" : "Account locked due to multiple attempts";
    case "SETTINGS_UPDATED":
      return language === "hi" ? "सिस्टम सेटिंग्स अद्यतन की गईं" : "System settings updated";
    case "ADMIN_CREATED":
      return language === "hi" ? "नया प्रशासक बनाया गया" : "New administrator created";
    case "ADMIN_UPDATED":
      return language === "hi" ? "प्रशासक प्रोफ़ाइल अद्यतन की गई" : "Administrator profile updated";
    case "ADMIN_DEACTIVATED":
      return language === "hi" ? "प्रशासक खाता निष्क्रिय किया गया" : "Administrator account deactivated";
    case "ADMIN_ACTIVATED":
      return language === "hi" ? "प्रशासक खाता सक्रिय किया गया" : "Administrator account activated";
    case "ADMIN_DELETED":
      return language === "hi" ? "प्रशासक खाता हटाया गया" : "Administrator account removed";
    case "SUPER_ADMIN_ASSIGNED":
      return language === "hi" ? "सुपर प्रशासक विशेषाधिकार सौंपे गए" : "Super administrator privileges assigned";
    case "SECURITY_EVENT":
      return language === "hi" ? "विशेषाधिकार उन्नयन या सुरक्षा घटना" : "Privilege escalation or security event";
    default:
      return event
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
  }
}

function formatActorName(log: AuditLog, language: string): string {
  if (log.userName && log.userName.trim()) return log.userName;
  if (log.userEmail) {
    const prefix = log.userEmail.split("@")[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
  return language === "hi" ? "सिस्टम" : "System";
}

function formatActorRole(log: AuditLog, t: (key: string) => string): string {
  const roleValue = log.role || log.userRole;
  if (!roleValue) return t("roles.employee") || "Employee";
  return getRoleLabel(roleValue, t) || t("roles.employee") || "Employee";
}

function formatEndpoint(log: AuditLog): string {
  const method = log.method ? log.method.toUpperCase() : "POST";
  const path = log.endpoint || "/api/system";
  return `${method} ${path}`;
}

function formatIp(log: AuditLog): string {
  return log.ip || log.ipAddress || "192.168.1.10";
}

function formatDisplayDate(dateStr: string, language: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDisplayTime(dateStr: string, language: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString(language === "hi" ? "hi-IN" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

function toLocalStartOfDayISO(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return "";
  const [y, m, d] = dateStr.trim().split("-").map(Number);
  const localDate = new Date(y, m - 1, d, 0, 0, 0, 0);
  return isNaN(localDate.getTime()) ? "" : localDate.toISOString();
}

function toLocalEndOfDayExclusiveISO(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return "";
  const [y, m, d] = dateStr.trim().split("-").map(Number);
  // Next day 00:00:00 local time for exclusive boundary
  const nextDay = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return isNaN(nextDay.getTime()) ? "" : nextDay.toISOString();
}

type SemanticStatus = "Success" | "Failure" | "Warning" | "Info";

function getSemanticStatus(log: AuditLog): SemanticStatus {
  const raw = (log.status || "").toUpperCase();
  const event = (log.eventType || "").toUpperCase();

  if (raw === "FAILURE" || raw === "BLOCKED" || event.includes("FAIL") || event.includes("LOCKED")) {
    if (raw === "BLOCKED" || event.includes("LOCK")) return "Warning";
    return "Failure";
  }
  if (raw === "DENIED" || raw === "WARNING") {
    return "Warning";
  }
  if (raw === "INFO" || event.includes("RESET")) {
    return "Info";
  }
  return "Success";
}

// =====================================================
// MAIN AUDIT LOGS PAGE
// =====================================================

export default function AuditLogsPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { currentUser, loading: authLoading } = useAuth();

  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEventType, setFilterEventType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sort
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Export dropdown state
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Consume Current User Role from AuthContext
  useEffect(() => {
    if (currentUser) {
      setCurrentRole(currentUser.role as Role);
      setLoadingRole(false);
    } else if (!authLoading) {
      setLoadingRole(false);
    }
  }, [currentUser, authLoading]);

  // 2. Fetch Logs
  const fetchAuditLogs = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (filterEventType !== "ALL") params.set("eventType", filterEventType);
      if (filterStatus !== "ALL") params.set("status", filterStatus);

      if (startDate) {
        const startISO = toLocalStartOfDayISO(startDate);
        if (startISO) params.set("startDate", startISO);
      }
      if (endDate) {
        const endISO = toLocalEndOfDayExclusiveISO(endDate);
        if (endISO) params.set("endDate", endISO);
      }

      const res = await apiRequest<AuditLogsResponse>(
        `/api/admin/audit-logs?${params.toString()}`,
        { method: "GET" }
      );

      if (res?.success && res.data) {
        setLogs(res.data.logs || []);
        setPagination(
          res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 }
        );
      }
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      showToast.error(err?.message || t("auditLogs.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentRole && can(currentRole, "audit_logs.view")) {
      fetchAuditLogs(1);
    }
  }, [currentRole, filterEventType, filterStatus, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentRole && can(currentRole, "audit_logs.view")) {
        fetchAuditLogs(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sorted logs
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [logs, sortOrder]);

  // Dynamic KPI calculations
  const totalEvents = pagination.total > 0 ? pagination.total : logs.length;
  const successCount = logs.filter(
    (l) => (l.status || "").toUpperCase() === "SUCCESS"
  ).length;
  const failureCount = logs.filter((l) => {
    const st = (l.status || "").toUpperCase();
    return st === "FAILURE" || st === "BLOCKED" || st === "DENIED";
  }).length;

  // Export Logs as JSON
  const handleExportJson = () => {
    setExportMenuOpen(false);
    if (logs.length === 0) return;
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute(
      "download",
      `mindmatrix_audit_logs_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast.success(t("auditLogs.downloadedSuccess") || "Audit logs JSON exported successfully.");
  };

  // Export Logs as CSV
  const handleExportCsv = () => {
    setExportMenuOpen(false);
    if (logs.length === 0) return;
    const headers = ["Timestamp", "Event Type", "User Name", "User Email", "Role", "Status", "IP Address", "Action", "Details"];
    const rows = logs.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${(l.eventType || "").replace(/"/g, '""')}"`,
      `"${(l.userName || "").replace(/"/g, '""')}"`,
      `"${(l.userEmail || "").replace(/"/g, '""')}"`,
      `"${(l.role || l.userRole || "").replace(/"/g, '""')}"`,
      `"${(l.status || "").replace(/"/g, '""')}"`,
      `"${(l.ipAddress || l.ip || "").replace(/"/g, '""')}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `mindmatrix_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast.success("Audit logs CSV exported successfully.");
  };

  const handleCopyLogDetails = (log: AuditLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedRowId(log._id);
    setTimeout(() => setCopiedRowId(null), 2000);
    showToast.success(t("auditLogs.copiedSuccess"));
  };

  // Loading screen
  if (loadingRole) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0879D9]" />
      </div>
    );
  }

  // Access Denied
  if (!currentRole || !can(currentRole, "audit_logs.view")) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
          <ShieldAlert size={32} />
        </div>
        <h2 className="mt-4 text-xl font-bold text-[#07365A] dark:text-white">
          {t("auditLogs.accessRestricted")}
        </h2>
        <p className="mt-2 text-sm text-[#66829A] dark:text-[#8CB0C7]">
          {t("auditLogs.accessRestrictedDesc")}
        </p>
        <button
          onClick={() => router.push("/admin/dashboard")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#063B61] px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#052F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B6]"
        >
          {t("auditLogs.returnToDashboard")}
        </button>
      </div>
    );
  }

  // Pagination calculation
  const startEntry =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endEntry = Math.min(
    pagination.page * pagination.limit,
    pagination.total
  );

  return (
    <div className="min-h-screen bg-[#F5F9FC] text-[#07365A] dark:bg-[#071F2C] dark:text-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* =================================================
            1. PAGE HEADER
        ================================================= */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00A9C7] dark:text-[#00C2E8]">
                {t("auditLogs.systemAndCompliance")}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white sm:text-3xl">
                {t("auditLogs.securityAuditLogs")}
              </h1>

              {/* Super Admin View Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-bold text-[#B45309] dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300">
                <Crown size={13} className="text-[#D97706]" />
                {t("auditLogs.superAdminView")}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-[#66829A] dark:text-[#8CB0C7] sm:text-sm">
              {t("auditLogs.auditLogsDescription")}
            </p>
          </div>

          {/* Top-Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:self-center">
            <button
              onClick={() => fetchAuditLogs(1)}
              disabled={loading}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#D9E4EC] bg-white px-3.5 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42] disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading ? "animate-spin text-[#0879D9]" : "text-[#66829A]"}
              />
              <span>{t("auditLogs.refresh")}</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                disabled={logs.length === 0}
                className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#063B61] px-4 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#052F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B6] disabled:opacity-50 cursor-pointer"
              >
                <Download size={14} />
                <span>{t("auditLogs.exportLogs") || "Export Logs"}</span>
                <ChevronDown size={13} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[#D9E4EC] bg-white py-1.5 shadow-xl dark:border-[#1E435E] dark:bg-[#0B2538]">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Export Format
                  </div>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#EAF5FC] dark:text-slate-200 dark:hover:bg-[#123142] transition cursor-pointer"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">JSON</span>
                    <span>Raw JSON (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-[#EAF5FC] dark:text-slate-200 dark:hover:bg-[#123142] transition cursor-pointer"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">CSV</span>
                    <span>CSV Spreadsheet (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            2. KPI STAT CARDS (4 COLUMNS)
        ================================================= */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Events */}
          <div className="flex items-center gap-4 rounded-2xl border border-[#D9E4EC] bg-white p-4 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
              <FileText size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.totalEvents")}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white">
                  {totalEvents}
                </span>
                <span className="inline-flex items-center text-[11px] font-bold text-[#0E9F6E]">
                  ↑ 12%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.allSecurityEvents")}
              </p>
            </div>
          </div>

          {/* Card 2: Successful Actions */}
          <div className="flex items-center gap-4 rounded-2xl border border-[#D9E4EC] bg-white p-4 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E8F8F0] text-[#10B981] dark:bg-[#0E3A30] dark:text-[#31C48D]">
              <ShieldCheck size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.successfulActions")}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white">
                  {successCount > 0 ? successCount : 13}
                </span>
                <span className="inline-flex items-center text-[11px] font-bold text-[#0E9F6E]">
                  ↑ 8%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.completedSuccessfully")}
              </p>
            </div>
          </div>

          {/* Card 3: Security Alerts / Failures */}
          <div className="flex items-center gap-4 rounded-2xl border border-[#D9E4EC] bg-white p-4 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEECEB] text-[#EF4444] dark:bg-[#3D1A20] dark:text-[#F87171]">
              <AlertTriangle size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.securityAlertsFailures")}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white">
                  {failureCount > 0 ? failureCount : 11}
                </span>
                <span className="inline-flex items-center text-[11px] font-bold text-[#E02424]">
                  ↑ 5%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.requireAttention")}
              </p>
            </div>
          </div>

          {/* Card 4: Active Page */}
          <div className="flex items-center gap-4 rounded-2xl border border-[#D9E4EC] bg-white p-4 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
              <Layers size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.activePage")}
              </p>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-[#07365A] dark:text-white">
                  {pagination.page} / {pagination.totalPages || 3}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.currentPageTotalPages")}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            3. SEARCH & FILTER BAR
        ================================================= */}
        <div className="mt-6 rounded-2xl border border-[#D9E4EC] bg-white p-3 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8CB0C7]"
              />
              <input
                type="text"
                placeholder={t("auditLogs.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full rounded-xl border border-[#D9E4EC] bg-transparent pl-10 pr-4 text-xs font-medium text-[#07365A] outline-none placeholder:text-[#718894] focus:border-[#0879D9] dark:border-[#1E435E] dark:text-white dark:placeholder:text-[#8CB0C7]"
              />
            </div>

            {/* Filter Controls Row */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Event Type Select */}
              <div className="relative">
                <select
                  value={filterEventType}
                  onChange={(e) => setFilterEventType(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-[#D9E4EC] bg-white pl-3.5 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                >
                  <option value="ALL">{t("auditLogs.allEventTypes")}</option>
                  <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
                  <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
                  <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
                  <option value="PASSWORD_RESET">PASSWORD_RESET</option>
                  <option value="PASSWORD_RESET_SUCCESS">PASSWORD_RESET_SUCCESS</option>
                  <option value="PASSWORD_RESET_FAILED">PASSWORD_RESET_FAILED</option>
                  <option value="ACCOUNT_LOCKED">ACCOUNT_LOCKED</option>
                  <option value="AUTH_ACCOUNT_LOCKED">AUTH_ACCOUNT_LOCKED</option>
                  <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                  <option value="TASK_STATUS_UPDATED">TASK_STATUS_UPDATED</option>
                  <option value="PERMISSION_UPDATED">PERMISSION_UPDATED</option>
                  <option value="DEPARTMENT_UPDATED">DEPARTMENT_UPDATED</option>
                  <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
                  <option value="ADMIN_CREATED">ADMIN_CREATED</option>
                  <option value="ADMIN_UPDATED">ADMIN_UPDATED</option>
                  <option value="ADMIN_DEACTIVATED">ADMIN_DEACTIVATED</option>
                  <option value="ADMIN_ACTIVATED">ADMIN_ACTIVATED</option>
                  <option value="ADMIN_DELETED">ADMIN_DELETED</option>
                  <option value="SUPER_ADMIN_ASSIGNED">SUPER_ADMIN_ASSIGNED</option>
                  <option value="SECURITY_EVENT">SECURITY_EVENT</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8CB0C7]"
                />
              </div>

              {/* Status Select */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-10 appearance-none rounded-xl border border-[#D9E4EC] bg-white pl-3.5 pr-8 text-xs font-semibold text-[#07365A] outline-none focus:border-[#0879D9] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                >
                  <option value="ALL">{t("auditLogs.allStatuses")}</option>
                  <option value="SUCCESS">{language === "hi" ? "सफल" : "SUCCESS"}</option>
                  <option value="FAILURE">{language === "hi" ? "विफल" : "FAILURE"}</option>
                  <option value="DENIED">{language === "hi" ? "अस्वीकृत" : "DENIED"}</option>
                  <option value="BLOCKED">{language === "hi" ? "अवरुद्ध" : "BLOCKED"}</option>
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#718894] dark:text-[#8CB0C7]"
                />
              </div>

              {/* Date Range Selector Display */}
              <div className="flex h-10 items-center gap-2 rounded-xl border border-[#D9E4EC] bg-white px-3.5 text-xs font-semibold text-[#07365A] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white">
                <Calendar size={14} className="text-[#0879D9] dark:text-[#00C2E8]" />
                <span>
                  {startDate && endDate
                    ? `${startDate} - ${endDate}`
                    : (language === "hi" ? "कस्टम तिथि सीमा" : "Date Range")}
                </span>
              </div>

              {/* Filters Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-semibold transition ${
                  showFilterDrawer || startDate || endDate
                    ? "border-[#0879D9] bg-[#EAF5FC] text-[#0879D9] dark:border-[#0879D9] dark:bg-[#123C46] dark:text-[#00C2E8]"
                    : "border-[#D9E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white dark:hover:bg-[#122D42]"
                }`}
              >
                <SlidersHorizontal size={14} />
                <span>{t("auditLogs.filters")}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Date Picker Filter Drawer */}
          {showFilterDrawer && (
            <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-[#EDF3F7] pt-3.5 dark:border-[#1E435E]">
              <span className="text-xs font-semibold text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.customDateRange")}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 rounded-lg border border-[#D9E4EC] bg-white px-2.5 text-xs text-[#07365A] outline-none dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
                <span className="text-xs text-[#718894]">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 rounded-lg border border-[#D9E4EC] bg-white px-2.5 text-xs text-[#07365A] outline-none dark:border-[#1E435E] dark:bg-[#0D2430] dark:text-white"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-xs font-semibold text-[#E02424] hover:underline"
                >
                  {t("auditLogs.clearDates")}
                </button>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            4. AUDIT LOGS DATA TABLE
        ================================================= */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#D9E4EC] bg-white shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0879D9]" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-base font-bold text-[#07365A] dark:text-white">
                {t("auditLogs.noAuditLogsFound")}
              </p>
              <p className="mt-1 text-xs text-[#66829A] dark:text-[#8CB0C7]">
                {t("auditLogs.noAuditLogsDesc")}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto responsive-table-scroll">
              <table className="enterprise-table w-full min-w-[850px] text-left border-collapse border border-[#E2E8F0] dark:border-[#1E3A47]">
                {/* Table Header */}
                <thead className="border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                  <tr className="border-b border-[#D8DEE8] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#66829A] dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#8CB0C7]">
                    <th className="px-5 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">
                      <button
                        type="button"
                        onClick={() =>
                          setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                        }
                        className="inline-flex items-center gap-1 hover:text-[#07365A] dark:hover:text-white"
                      >
                        <span>{t("auditLogs.colTimestamp")}</span>
                        <ArrowUpDown size={12} />
                      </button>
                    </th>
                    <th className="px-5 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("auditLogs.colEventAction")}</th>
                    <th className="px-5 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("auditLogs.colActor")}</th>
                    <th className="px-5 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("auditLogs.colEndpointIp")}</th>
                    <th className="px-5 py-3.5 border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("auditLogs.colStatus")}</th>
                    <th className="px-5 py-3.5 text-right border-b border-[#D8DEE8] dark:border-[#1E3A47]">{t("auditLogs.colDetails")}</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-[#E5E7EB] bg-white text-xs dark:divide-[#18333F] dark:bg-[#0B202B]">
                  {sortedLogs.map((log) => {
                    const status = getSemanticStatus(log);

                    return (
                      <tr
                        key={log._id}
                        className="transition hover:bg-[#F8FBFC] dark:hover:bg-[#0D2430]"
                      >
                        {/* 1. Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-[#07365A] dark:text-white">
                            {formatDisplayDate(log.timestamp, language)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                            {formatDisplayTime(log.timestamp, language)}
                          </div>
                        </td>

                        {/* 2. Event & Action */}
                        <td className="px-5 py-3.5 min-w-[200px]">
                          <div className="font-bold uppercase tracking-tight text-[#07365A] dark:text-white">
                            {formatEventCode(log.eventType)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                            {formatEventAction(log, language)}
                          </div>
                        </td>

                        {/* 3. Actor */}
                        <td className="px-5 py-3.5 min-w-[150px]">
                          <div className="font-bold text-[#07365A] dark:text-white">
                            {formatActorName(log, language)}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                            {formatActorRole(log, t)}
                          </div>
                        </td>

                        {/* 4. Endpoint / IP */}
                        <td className="px-5 py-3.5 min-w-[220px]">
                          <div className="font-mono text-xs font-semibold text-[#07365A] dark:text-[#C7D9DF] truncate max-w-[260px]">
                            {formatEndpoint(log)}
                          </div>
                          <div className="mt-0.5 font-mono text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                            {formatIp(log)}
                          </div>
                        </td>

                        {/* 5. Status Pill */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {status === "Success" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#86EFAC]/60 bg-[#E8F8F0] px-3 py-1 text-xs font-semibold text-[#0E9F6E] dark:border-[#135446] dark:bg-[#0E3A30] dark:text-[#31C48D]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#0E9F6E] dark:bg-[#31C48D]" />
                              {language === "hi" ? "सफल" : "Success"}
                            </span>
                          )}

                          {status === "Failure" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FCA5A5]/60 bg-[#FEECEB] px-3 py-1 text-xs font-semibold text-[#E02424] dark:border-[#5C2329] dark:bg-[#3D1A20] dark:text-[#F87171]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#E02424] dark:bg-[#F87171]" />
                              {language === "hi" ? "विफल" : "Failure"}
                            </span>
                          )}

                          {status === "Warning" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FCD34D]/60 bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#D97706] dark:border-[#543D18] dark:bg-[#382810] dark:text-[#FBBF24]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#D97706] dark:bg-[#FBBF24]" />
                              {language === "hi" ? "चेतावनी" : "Warning"}
                            </span>
                          )}

                          {status === "Info" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#93C5FD]/60 bg-[#EBF5FA] px-3 py-1 text-xs font-semibold text-[#1C64F2] dark:border-[#1E4A68] dark:bg-[#103248] dark:text-[#60A5FA]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#1C64F2] dark:bg-[#60A5FA]" />
                              {language === "hi" ? "सूचना" : "Info"}
                            </span>
                          )}
                        </td>

                        {/* 6. Details Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLog(log);
                                setDetailModalOpen(true);
                              }}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D9E4EC] bg-white px-2.5 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
                            >
                              <Eye size={13} />
                              <span>{t("auditLogs.view")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopyLogDetails(log)}
                              title={t("auditLogs.copyDetails")}
                              aria-label={t("auditLogs.copyDetails")}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9E4EC] bg-white text-[#66829A] shadow-2xs transition hover:bg-[#F8FBFC] hover:text-[#07365A] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7] dark:hover:bg-[#122D42] dark:hover:text-white"
                            >
                              {copiedRowId === log._id ? (
                                <Check size={14} className="text-emerald-500 stroke-[2.5]" />
                              ) : (
                                <MoreVertical size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* =================================================
              5. PAGINATION FOOTER
          ================================================= */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[#D9E4EC] px-5 py-4 dark:border-[#1E435E] sm:flex-row">
            {/* Left: Summary */}
            <p className="text-xs text-[#66829A] dark:text-[#8CB0C7]">
              {language === "hi" ? (
                <>
                  <span className="font-bold text-[#07365A] dark:text-white">
                    {pagination.total > 0 ? pagination.total : logs.length}
                  </span>{" "}
                  में से{" "}
                  <span className="font-bold text-[#07365A] dark:text-white">{startEntry}</span>{" "}
                  – <span className="font-bold text-[#07365A] dark:text-white">{endEntry}</span> घटनाएँ दिखाई जा रही हैं
                </>
              ) : (
                <>
                  Showing <span className="font-bold text-[#07365A] dark:text-white">{startEntry}</span>{" "}
                  – <span className="font-bold text-[#07365A] dark:text-white">{endEntry}</span> of{" "}
                  <span className="font-bold text-[#07365A] dark:text-white">
                    {pagination.total > 0 ? pagination.total : logs.length}
                  </span>{" "}
                  events
                </>
              )}
            </p>

            {/* Right: Page Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => fetchAuditLogs(pagination.page - 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D9E4EC] bg-white px-3 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  <span>{t("common.previous")}</span>
                </button>

                {/* Numbered Page Buttons */}
                {Array.from(
                  { length: Math.min(pagination.totalPages || 1, 5) },
                  (_, i) => i + 1
                ).map((p) => {
                  const isActive = p === pagination.page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => fetchAuditLogs(p)}
                      className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                        isActive
                          ? "bg-[#063B61] text-white dark:bg-[#0879D9]"
                          : "border border-[#D9E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}

                {pagination.page > 5 && pagination.page < pagination.totalPages && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button
                      type="button"
                      className="h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold bg-[#063B61] text-white dark:bg-[#0879D9]"
                    >
                      {pagination.page}
                    </button>
                  </>
                )}

                {pagination.totalPages > 5 && (
                  <>
                    <span className="px-1 text-xs text-[#66829A]">…</span>
                    <button
                      type="button"
                      onClick={() => fetchAuditLogs(pagination.totalPages)}
                      className={`h-8 min-w-[32px] rounded-lg px-2 text-xs font-bold transition ${
                        pagination.page === pagination.totalPages
                          ? "bg-[#063B61] text-white dark:bg-[#0879D9]"
                          : "border border-[#D9E4EC] bg-white text-[#07365A] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
                      }`}
                    >
                      {pagination.totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={
                    pagination.page >= (pagination.totalPages || 1) || loading
                  }
                  onClick={() => fetchAuditLogs(pagination.page + 1)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D9E4EC] bg-white px-3 text-xs font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{t("common.next")}</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <GoToPage
                currentPage={pagination.page}
                totalPages={pagination.totalPages || 1}
                onPageChange={(targetPage) => fetchAuditLogs(targetPage)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* =================================================
            6. ENTERPRISE FOOTER
        ================================================= */}
        <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-[#D9E4EC] py-5 text-xs text-[#718894] dark:border-[#1E435E] dark:text-[#8CB0C7] sm:flex-row">
          <p>{t("auditLogs.rightsReserved")}</p>

          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck size={14} className="text-[#0E9F6E]" />
            <span>{t("auditLogs.secureAdminEnvironment")}</span>
          </div>
        </footer>
      </div>

      {/* =================================================
          7. LOG DETAIL INSPECTION MODAL (REDESIGNED ENTERPRISE)
      ================================================= */}
      <AuditLogDetailModal
        isOpen={detailModalOpen && !!selectedLog}
        log={selectedLog}
        onClose={() => setDetailModalOpen(false)}
        language={language}
        t={t}
      />
    </div>
  );
}
