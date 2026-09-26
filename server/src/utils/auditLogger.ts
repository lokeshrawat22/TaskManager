import { Request } from "express";
import AuditLog from "../models/auditLog.model.js";

export type AuditEventType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_LOGOUT"
  | "PASSWORD_RESET_SUCCESS"
  | "PASSWORD_RESET_FAILED"
  | "ACCOUNT_DELETED"
  | "TASK_AUTHZ_DENIED"
  | "TASK_STATUS_UPDATED"
  | "DATA_EXPORTED"
  | "CONSENT_RECORDED"
  | "SECURITY_EVENT"
  | "ROLE_CHANGED"
  | "ADMIN_CREATED"
  | "ADMIN_UPDATED"
  | "ADMIN_DEACTIVATED"
  | "ADMIN_ACTIVATED"
  | "ADMIN_DELETED"
  | "ADMIN_BLOCKED"
  | "ADMIN_UNBLOCKED"
  | "EMPLOYEE_BLOCKED"
  | "EMPLOYEE_UNBLOCKED"
  | "SETTINGS_UPDATED"
  | "INTEGRATION_UPDATED"
  | "SUPER_ADMIN_ASSIGNED"
  | "SUPER_ADMIN_BLOCKED";

export type AuditStatus = "SUCCESS" | "FAILURE" | "DENIED" | "BLOCKED";

export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  status: AuditStatus;
  userId?: string;
  userEmail?: string;
  userName?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  details?: Record<string, unknown>;
}

/**
 * Structured security audit logger for SOC 2 Trust Services Criteria (CC6.8, CC7.2),
 * India DPDP Act 2023 accountability, and MindMatrix Super Admin audit trail.
 * Outputs machine-parseable JSON logs and persists records to MongoDB for Super Admin dashboard.
 */
const SENSITIVE_KEY_REGEX = /password|token|secret|authorization|cookie|apikey|refreshToken|pin|cvv|otp/i;

function sanitizeDetails(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeDetails);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEY_REGEX.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const auditLog = (
  eventType: AuditEventType,
  status: AuditStatus,
  req?: Request,
  extra?: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    role?: string;
    details?: Record<string, unknown>;
  }
): void => {
  const forwarded = req?.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string"
    ? forwarded.split(",")[0].trim()
    : req?.socket?.remoteAddress || req?.ip || "unknown";

  const userAgent = req?.headers["user-agent"] || "unknown";
  const user = (req as any)?.user;

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    status,
    userId: extra?.userId || user?.userId || undefined,
    userEmail: extra?.userEmail || user?.email || undefined,
    userName: extra?.userName || user?.name || undefined,
    role: extra?.role || user?.role || undefined,
    ip,
    userAgent,
    endpoint: req?.originalUrl || req?.url || undefined,
    method: req?.method || undefined,
    details: sanitizeDetails(extra?.details || {}),
  };


  // Asynchronously persist to database (non-blocking)
  AuditLog.create({
    timestamp: new Date(entry.timestamp),
    eventType: entry.eventType,
    status: entry.status,
    userId: entry.userId,
    userEmail: entry.userEmail,
    userName: entry.userName,
    role: entry.role,
    ip: entry.ip,
    userAgent: entry.userAgent,
    endpoint: entry.endpoint,
    method: entry.method,
    details: entry.details,
  }).catch((err) => {
    console.error("[SECURITY_AUDIT] Failed to persist audit log to MongoDB:", err?.message || err);
  });
};
