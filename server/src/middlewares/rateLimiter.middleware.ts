import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { auditLog } from "../utils/auditLogger.js";

/**
 * Normalizes email or phone identifier for account-aware rate limiting.
 * Trims whitespace and converts to lowercase to prevent bypass via casing/spacing.
 */
export const normalizeLoginIdentifier = (req: Request): string => {
  const raw =
    req.body?.identifier ||
    req.body?.email ||
    req.body?.phone ||
    req.body?.username ||
    "";
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().toLowerCase();
};

/**
 * Helper to get a safe IP key for express-rate-limit
 */
const getClientIpKey = (req: Request): string => {
  const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";
  try {
    return ipKeyGenerator(ip);
  } catch {
    return ip;
  }
};

/**
 * Account-Aware Rate Limiter for Login
 * - Limits failed login attempts per account/email (5 failed attempts per 15 minutes)
 * - Independent tracking per normalized account identifier
 * - Only counts FAILED authentication attempts (status >= 400)
 * - Resets on successful login via resetAccountLoginAttempts()
 */
export const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 failed attempts per account
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only failed requests count towards lockout
  validate: { default: true, keyGeneratorIpFallback: false },
  keyGenerator: (req: Request): string => {
    const identifier = normalizeLoginIdentifier(req);
    if (identifier) {
      return `account:${identifier}`;
    }
    return `ip:${getClientIpKey(req)}`;
  },
  handler: (req: Request, res: Response) => {
    const info = (req as any).rateLimit;
    const identifier = normalizeLoginIdentifier(req);
    const key = identifier ? `account:${identifier}` : `ip:${getClientIpKey(req)}`;
    const resetTime = info?.resetTime instanceof Date ? info.resetTime.toISOString() : undefined;

    console.warn(
      `[RateLimit:BLOCKED] Account locked | Key: ${key} | IP: ${getClientIpKey(req)} | Failed attempts: ${info?.used ?? "max"} | Lock expiry: ${resetTime ?? "in 15 minutes"}`
    );

    auditLog("AUTH_ACCOUNT_LOCKED", "BLOCKED", req, {
      userEmail: identifier || undefined,
      details: {
        reason: "Too many failed login attempts",
        lockExpiry: resetTime ?? "in 15 minutes",
        ip: getClientIpKey(req),
      },
    });

    res.status(429).json({
      success: false,
      message: "Too many failed login attempts. Please try again later.",
    });
  },
});

/**
 * IP-Level Brute-Force and DoS Protection Layer
 * - Generous threshold (60 requests per 15 minutes)
 * - Protects server against volumetric credential stuffing / DDoS
 * - Shared Wi-Fi / office NAT users will not be affected by single-user failed attempts
 * - Only failed attempts count towards the IP limit
 */
export const ipLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 60, // 60 failed attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Legitimate logins do not exhaust the IP quota
  keyGenerator: (req: Request): string => {
    return getClientIpKey(req);
  },
  handler: (req: Request, res: Response) => {
    const info = (req as any).rateLimit;
    const ip = getClientIpKey(req);
    const resetTime = info?.resetTime instanceof Date ? info.resetTime.toISOString() : undefined;

    console.warn(
      `[RateLimit:IP_BLOCKED] High volume abuse detected | IP: ${ip} | Failed attempts: ${info?.used ?? "max"} | Lock expiry: ${resetTime ?? "in 15 minutes"}`
    );

    res.status(429).json({
      success: false,
      message: "Too many login attempts from this network. Please try again later.",
    });
  },
});

/**
 * Reset failed login attempt counter for a specific account.
 * Invoked on successful password verification.
 */
export const resetAccountLoginAttempts = async (identifier: string): Promise<void> => {
  if (!identifier) return;
  const normalized = identifier.trim().toLowerCase();
  const key = `account:${normalized}`;
  try {
    await accountLoginLimiter.resetKey(key);
    console.log(`[RateLimit:RESET] Counter reset for account: ${key}`);
  } catch (err) {
    console.error(`[RateLimit:RESET_ERROR] Failed to reset key ${key}:`, err);
  }
};

/**
 * Alias for backward compatibility if any module imports loginLimiter
 */
export const loginLimiter = accountLoginLimiter;

/**
 * Rate Limiter for OTP Verification and Resend Endpoints
 * 8 requests per 10 minutes per IP
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many OTP requests. Please wait a few minutes before trying again.",
  },
});

/**
 * Rate Limiter for Password Reset Endpoints
 * 5 requests per 15 minutes per IP
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "TOO_MANY_REQUESTS",
    message: "Too many password reset requests. Please try again after 15 minutes.",
  },
});
