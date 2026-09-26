"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  Globe,
  Key,
  Layers,
  Monitor,
  Server,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/lib/toast";
import { getRoleLabel } from "@/constants/rbac";

export interface AuditLog {
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

interface AuditLogDetailModalProps {
  isOpen: boolean;
  log: AuditLog | null;
  onClose: () => void;
  language: string;
  t: (key: string) => string;
}

// =====================================================
// HELPER FORMATTERS
// =====================================================

function formatEventCode(eventType?: string): string {
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

function getFormattedDateTime(timestamp: string, language: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "—";
    const dateStr = d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString(language === "hi" ? "hi-IN" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return "—";
  }
}

function getRelativeTime(timestamp: string, language: string): string {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    if (diffMs < 0) return language === "hi" ? "अभी" : "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return language === "hi" ? "अभी" : "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return language === "hi" ? `${diffMin} मिनट पहले` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return language === "hi" ? `${diffHours} घंटे पहले` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return language === "hi" ? "कल" : "Yesterday";
    if (diffDays < 30) return language === "hi" ? `${diffDays} दिन पहले` : `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return language === "hi" ? `${diffMonths} महीने पहले` : `${diffMonths}mo ago`;
  } catch {
    return "";
  }
}

// =====================================================
// SYNTAX HIGHLIGHTER FOR JSON VIEWER
// Safe, token-based React renderer (zero HTML injection)
// =====================================================

function renderHighlightedJson(jsonStr: string): React.ReactNode[] {
  const regex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?|[{}\[\],:])/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = regex.exec(jsonStr)) !== null) {
    const textBefore = jsonStr.slice(lastIndex, match.index);
    if (textBefore) {
      elements.push(<span key={`text-${keyIndex++}`}>{textBefore}</span>);
    }

    const token = match[0];
    if (token.startsWith('"')) {
      if (token.endsWith(":") || match[2]) {
        // JSON Key
        const colonIdx = token.lastIndexOf(":");
        const keyPart = colonIdx !== -1 ? token.slice(0, colonIdx) : token;
        const colonPart = colonIdx !== -1 ? token.slice(colonIdx) : "";
        elements.push(
          <span key={`key-${keyIndex++}`} className="text-[#38BDF8] font-semibold">
            {keyPart}
          </span>
        );
        if (colonPart) {
          elements.push(
            <span key={`colon-${keyIndex++}`} className="text-[#94A3B8]">
              {colonPart}
            </span>
          );
        }
      } else {
        // String value
        elements.push(
          <span key={`str-${keyIndex++}`} className="text-[#4ADE80]">
            {token}
          </span>
        );
      }
    } else if (token === "true" || token === "false") {
      elements.push(
        <span key={`bool-${keyIndex++}`} className="text-[#C084FC] font-semibold">
          {token}
        </span>
      );
    } else if (token === "null") {
      elements.push(
        <span key={`null-${keyIndex++}`} className="text-[#94A3B8] italic">
          {token}
        </span>
      );
    } else if (/^-?\d/.test(token)) {
      elements.push(
        <span key={`num-${keyIndex++}`} className="text-[#FB923C]">
          {token}
        </span>
      );
    } else {
      // Punctuation brackets and commas
      elements.push(
        <span key={`punc-${keyIndex++}`} className="text-[#64748B]">
          {token}
        </span>
      );
    }

    lastIndex = regex.lastIndex;
  }

  const remaining = jsonStr.slice(lastIndex);
  if (remaining) {
    elements.push(<span key={`rem-${keyIndex++}`}>{remaining}</span>);
  }

  return elements;
}

// =====================================================
// COMPONENT: AuditLogDetailModal
// =====================================================

export function AuditLogDetailModal({
  isOpen,
  log,
  onClose,
  language,
  t,
}: AuditLogDetailModalProps) {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Normalize JSON payload data dynamically
  const payloadData = useMemo(() => {
    if (!log) return {};
    if (log.details && Object.keys(log.details).length > 0) {
      return log.details;
    }
    return {
      action: log.action || log.eventType,
      eventType: log.eventType,
      resource: log.resource || undefined,
      endpoint: log.endpoint,
      method: log.method,
      ip: log.ip || log.ipAddress,
      statusCode: log.statusCode,
      status: log.status,
      user: {
        id: log.userId,
        email: log.userEmail,
        name: log.userName,
        role: log.role || log.userRole,
      },
      userAgent: log.userAgent,
      errorMessage: log.errorMessage || undefined,
      timestamp: log.timestamp,
    };
  }, [log]);

  const rawJsonString = useMemo(() => JSON.stringify(payloadData, null, 2), [payloadData]);

  // Copy JSON handler with fallback
  const handleCopyJson = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(rawJsonString);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = rawJsonString;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedJson(true);
      showToast.success(t("auditLogs.rawJsonCopied") || "JSON payload copied to clipboard.");
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      showToast.error("Failed to copy JSON.");
    }
  };

  // Copy ID handler
  const handleCopyId = async () => {
    if (!log?._id) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(log._id);
      }
      setCopiedId(true);
      showToast.success(t("auditLogs.copiedSuccess") || "ID copied to clipboard.");
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // ignore
    }
  };

  // Copy IP handler
  const handleCopyIp = async (ipText: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(ipText);
      }
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!log) return null;

  const endpointText = log.endpoint || "/api/system";
  const endpointMethod = (log.method || "POST").toUpperCase();
  const clientIp = log.ip || log.ipAddress || "192.168.1.10";
  const userAgentText = log.userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)";
  const relativeTime = getRelativeTime(log.timestamp, language);
  const formattedDateTime = getFormattedDateTime(log.timestamp, language);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-[50vw] max-w-[50vw] max-lg:w-[70vw] max-lg:max-w-[70vw] max-sm:w-[94vw] max-sm:max-w-[94vw] mx-auto"
      ariaLabel={t("auditLogs.logInspection") || "Audit Log Inspection"}
    >
      <div className="relative flex flex-col max-h-[85vh] w-full rounded-[16px] border border-[#D9E4EC] bg-white shadow-2xl dark:border-[#1E435E] dark:bg-[#0B2538] overflow-hidden">
        {/* =================================================
            1. FIXED / STICKY HEADER (COMPACT)
        ================================================= */}
        <header className="flex-shrink-0 flex items-center justify-between border-b border-[#EDF3F7] px-5 py-3.5 dark:border-[#1E435E] bg-white dark:bg-[#0B2538]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Audit / Document Icon in light-blue rounded square */}
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#CDE5F7] bg-[#EBF5FA] text-[#0879D9] shadow-2xs dark:border-[#1E435E] dark:bg-[#103248] dark:text-[#00C2E8]">
              <FileText size={17} className="stroke-[2.2]" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-[#07365A] dark:text-white truncate">
                {t("auditLogs.logInspection") || "Audit Log Inspection"}
              </h2>

              {/* Monospace Audit Log ID with Copy Action */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono text-[#66829A] dark:text-[#8CB0C7] truncate">
                  ID: <span className="font-semibold select-all">{log._id}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  title={t("auditLogs.copyId") || "Copy ID"}
                  aria-label={t("auditLogs.copyId") || "Copy ID"}
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-[#66829A] hover:bg-[#EBF5FA] hover:text-[#0879D9] dark:text-[#8CB0C7] dark:hover:bg-[#103248] dark:hover:text-[#00C2E8] transition-colors"
                >
                  {copiedId ? <Check size={11} className="text-emerald-500" /> : <Copy size={10} />}
                </button>
              </div>
            </div>
          </div>

          {/* Close 'X' Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label={t("auditLogs.close") || "Close"}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-transparent text-[#66829A] transition hover:border-[#D9E4EC] hover:bg-[#F8FBFC] hover:text-[#07365A] focus:outline-hidden focus:ring-2 focus:ring-[#0879D9]/30 dark:text-[#8CB0C7] dark:hover:border-[#1E435E] dark:hover:bg-[#0D2430] dark:hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        {/* =================================================
            2. SCROLLABLE BODY CONTENT (COMPACT SPACING)
        ================================================= */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3.5">
          {/* =================================================
              EVENT INFORMATION: 2-COLUMN GRID
          ================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Card 1: Event Type */}
            <div className="group flex flex-col justify-between rounded-xl border border-[#D9E4EC] bg-[#F8FBFC]/75 p-3 sm:p-3.5 transition hover:border-[#BED6E6] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430]/60 dark:hover:border-[#275578] dark:hover:bg-[#0D2430]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                    <Layers size={13} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#718894] dark:text-[#8CB0C7]">
                    {t("auditLogs.eventType") || "Event Type"}
                  </span>
                </div>

                {/* Event Type Badge (ROLE_CHANGED shown as blue badge) */}
                <span className="inline-flex items-center gap-1 rounded-md border border-[#B9E1F7] bg-[#EBF5FA] px-2 py-0.5 text-[11px] font-bold font-mono text-[#0879D9] dark:border-[#1E4A68] dark:bg-[#103248] dark:text-[#00C2E8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0879D9] dark:bg-[#00C2E8]" />
                  {formatEventCode(log.eventType)}
                </span>
              </div>

              <div className="mt-2.5">
                <p className="text-sm font-bold text-[#07365A] dark:text-white leading-snug">
                  {formatEventAction(log, language)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                  {log.action ? `${formatEventCode(log.eventType)}` : "Standard system audit event"}
                </p>
              </div>
            </div>

            {/* Card 2: Timestamp */}
            <div className="group flex flex-col justify-between rounded-xl border border-[#D9E4EC] bg-[#F8FBFC]/75 p-3 sm:p-3.5 transition hover:border-[#BED6E6] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430]/60 dark:hover:border-[#275578] dark:hover:bg-[#0D2430]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                    <Clock size={13} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#718894] dark:text-[#8CB0C7]">
                    {t("auditLogs.colTimestamp") || "Timestamp"}
                  </span>
                </div>

                {relativeTime && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-[#D9E4EC] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#66829A] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-[#8CB0C7]">
                    <span className="h-1 w-1 rounded-full bg-[#0879D9]" />
                    {relativeTime}
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                <p className="text-sm font-bold text-[#07365A] dark:text-white leading-snug">
                  {formattedDateTime}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-[#66829A] dark:text-[#8CB0C7]">
                  ISO: {log.timestamp}
                </p>
              </div>
            </div>

            {/* Card 3: Actor Identity */}
            <div className="group flex flex-col justify-between rounded-xl border border-[#D9E4EC] bg-[#F8FBFC]/75 p-3 sm:p-3.5 transition hover:border-[#BED6E6] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430]/60 dark:hover:border-[#275578] dark:hover:bg-[#0D2430]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                    <UserCheck size={13} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#718894] dark:text-[#8CB0C7]">
                    {t("auditLogs.actorIdentity") || "Actor Identity"}
                  </span>
                </div>

                {log.userId && (
                  <span className="font-mono text-[10px] text-[#66829A] dark:text-[#8CB0C7]">
                    UID: {log.userId.slice(-6)}
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                <p className="text-sm font-bold text-[#07365A] dark:text-white truncate leading-snug">
                  {formatActorName(log, language)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7] truncate">
                  {log.userEmail || t("auditLogs.systemUser") || "System user"}
                </p>
              </div>
            </div>

            {/* Card 4: Role & Permissions */}
            <div className="group flex flex-col justify-between rounded-xl border border-[#D9E4EC] bg-[#F8FBFC]/75 p-3 sm:p-3.5 transition hover:border-[#BED6E6] hover:bg-[#F8FBFC] dark:border-[#1E435E] dark:bg-[#0D2430]/60 dark:hover:border-[#275578] dark:hover:bg-[#0D2430]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                    <ShieldCheck size={13} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#718894] dark:text-[#8CB0C7]">
                    {t("auditLogs.roleAndPermissions") || "Role & Permissions"}
                  </span>
                </div>

                {/* SUCCESS as green status badge aligned to the right */}
                {log.status === "SUCCESS" || !log.status ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 shadow-2xs dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SUCCESS
                  </span>
                ) : log.status === "FAILURE" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-red-700 shadow-2xs dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    FAILURE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 shadow-2xs dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {log.status}
                  </span>
                )}
              </div>

              <div className="mt-2.5">
                <p className="text-sm font-bold text-[#07365A] dark:text-white truncate leading-snug">
                  {formatActorRole(log, t)}
                </p>
                <p className="mt-0.5 text-[11px] text-[#66829A] dark:text-[#8CB0C7]">
                  {log.statusCode ? `HTTP ${log.statusCode}` : "Verified administrative access"}
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              3. CLIENT ENVIRONMENT & ENDPOINT (FULL WIDTH)
          ================================================= */}
          <div className="rounded-xl border border-[#D9E4EC] bg-[#F8FBFC]/75 p-3.5 dark:border-[#1E435E] dark:bg-[#0D2430]/60">
            <div className="flex items-center gap-1.5 mb-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
                <Server size={12} />
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#718894] dark:text-[#8CB0C7]">
                {t("auditLogs.clientEnvironmentEndpoint") || "Client Environment & Endpoint"}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Endpoint */}
              <div className="flex flex-col justify-between rounded-lg border border-[#E2ECF3] bg-white p-2.5 dark:border-[#1E435E] dark:bg-[#071F2C]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("auditLogs.endpoint") || "Endpoint"}
                </span>
                <div className="mt-1.5 flex items-start gap-1.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                      endpointMethod === "POST"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                        : endpointMethod === "DELETE"
                        ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                        : endpointMethod === "PUT" || endpointMethod === "PATCH"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                        : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                    }`}
                  >
                    {endpointMethod}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-[#07365A] dark:text-white break-all leading-tight">
                    {endpointText}
                  </span>
                </div>
              </div>

              {/* Client IP */}
              <div className="flex flex-col justify-between rounded-lg border border-[#E2ECF3] bg-white p-2.5 dark:border-[#1E435E] dark:bg-[#071F2C]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                    {t("auditLogs.clientIp") || "Client IP"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyIp(clientIp)}
                    title="Copy IP"
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-[#66829A] hover:bg-[#EBF5FA] hover:text-[#0879D9] dark:text-[#8CB0C7] dark:hover:bg-[#103248] dark:hover:text-[#00C2E8] transition-colors"
                  >
                    {copiedIp ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Globe size={12} className="text-[#0879D9] dark:text-[#00C2E8] flex-shrink-0" />
                  <span className="font-mono text-[11px] font-bold text-[#07365A] dark:text-white">
                    {clientIp}
                  </span>
                </div>
              </div>

              {/* User Agent */}
              <div className="flex flex-col justify-between rounded-lg border border-[#E2ECF3] bg-white p-2.5 dark:border-[#1E435E] dark:bg-[#071F2C]">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#66829A] dark:text-[#8CB0C7]">
                  {t("auditLogs.userAgent") || "User Agent"}
                </span>
                <div className="mt-1.5 flex items-start gap-1">
                  <Monitor size={12} className="text-[#66829A] dark:text-[#8CB0C7] flex-shrink-0 mt-0.5" />
                  <span className="font-mono text-[10px] text-[#486581] dark:text-[#8CB0C7] break-all line-clamp-2 leading-tight" title={userAgentText}>
                    {userAgentText}
                  </span>
                </div>
              </div>
            </div>

            {/* Error Message if present */}
            {log.errorMessage && (
              <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/90 p-2.5 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold">{t("auditLogs.errorMessage") || "Error Message:"}</p>
                  <p className="mt-0.5 font-mono text-[11px] break-all text-red-700 dark:text-red-400">
                    {log.errorMessage}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================
              4. JSON PAYLOAD VIEWER (COMPACT)
          ================================================= */}
          <div className="space-y-1.5">
            {/* Header & Copy Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#07365A] text-white dark:bg-[#103248] dark:text-[#00C2E8]">
                  <FileCode size={12} />
                </div>
                <h3 className="text-[11px] font-bold text-[#07365A] dark:text-white">
                  {t("auditLogs.eventDetailsJson") || "Event Details (JSON Payload)"}
                </h3>
              </div>

              {/* Copy JSON button */}
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1 rounded-md border border-[#D9E4EC] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#07365A] shadow-2xs transition hover:bg-[#F8FBFC] hover:border-[#BED6E6] dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white dark:hover:bg-[#122D42]"
              >
                {copiedJson ? (
                  <>
                    <Check size={11} className="text-emerald-500 stroke-[2.5]" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {t("auditLogs.copied") || "Copied!"}
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={11} className="text-[#0879D9] dark:text-[#00C2E8]" />
                    <span>{t("auditLogs.copyJson") || "Copy JSON"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Dark Code-Editor Style Container */}
            <div className="relative rounded-lg border border-[#1B3147] bg-[#081622] shadow-inner overflow-hidden">
              {/* Window Title Bar */}
              <div className="flex items-center justify-between border-b border-[#142637] bg-[#0A1A28] px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]/80" />
                  <span className="h-2 w-2 rounded-full bg-[#F59E0B]/80" />
                  <span className="h-2 w-2 rounded-full bg-[#10B981]/80" />
                  <span className="ml-1.5 font-mono text-[10px] text-[#64748B]">audit_payload.json</span>
                </div>
                <span className="font-mono text-[9px] text-[#475569]">JSON • UTF-8</span>
              </div>

              {/* Scrollable Code Area */}
              <pre className="max-h-40 sm:max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-[#E2E8F0] whitespace-pre selection:bg-[#0879D9]/30">
                <code>{renderHighlightedJson(rawJsonString)}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* =================================================
            5. FIXED / STICKY FOOTER (COMPACT)
        ================================================= */}
        <footer className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-[#EDF3F7] bg-[#F8FBFC] px-5 py-3 dark:border-[#1E435E] dark:bg-[#0D2A3E]">
          {/* Left: Audit Inspection Note */}
          <div className="flex items-center gap-2 text-[#66829A] dark:text-[#8CB0C7]">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-[#EBF5FA] text-[#0879D9] dark:bg-[#103248] dark:text-[#00C2E8]">
              <ShieldCheck size={13} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#07365A] dark:text-white">
                {t("auditLogs.inspectedFromAuditLogs") || "Inspected from audit logs"}
              </p>
              <p className="text-[10px] text-[#66829A] dark:text-[#8CB0C7]">
                {t("auditLogs.inspectedFromAuditLogsDesc") || "This record shows the details of the selected audit event."}
              </p>
            </div>
          </div>

          {/* Right: Primary Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-[#063B61] px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#052F4D] focus:outline-hidden focus:ring-2 focus:ring-[#0879D9]/50 dark:bg-[#0879D9] dark:hover:bg-[#0665B6]"
          >
            {t("auditLogs.close") || "Close"}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

export default AuditLogDetailModal;
