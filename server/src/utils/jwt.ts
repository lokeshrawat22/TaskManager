import crypto from "crypto";
import type { CookieOptions } from "express";
import jwt, {
  JwtPayload,
  SignOptions,
} from "jsonwebtoken";

// =====================================================
// TOKEN ROLE
// =====================================================

export type UserRole =
  | "super_admin"
  | "administrator"
  | "admin"
  | "employee"
  | "user";

// =====================================================
// TOKEN PAYLOAD
// =====================================================

export interface TokenPayload {
  userId: string;
  sub?: string;
  role?: UserRole;
  sessionId?: string;
  sessionKey?: string;
  type?: "access" | "refresh";
  rememberMe?: boolean;
}

// =====================================================
// JWT DECODED PAYLOAD
// =====================================================

interface DecodedToken
  extends JwtPayload {
  userId: string;
  sub?: string;
  role?: UserRole;
  sessionId?: string;
  sessionKey?: string;
  type?: "access" | "refresh";
  rememberMe?: boolean;
}

// =====================================================
// TOKEN & COOKIE EXPIRY CONSTANTS
// =====================================================

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY_REMEMBER = "30d";
export const REFRESH_TOKEN_EXPIRY_DEFAULT = "1d";

export const ACCESS_TOKEN_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
export const REFRESH_TOKEN_COOKIE_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60 * 1000; // 30 days
export const REFRESH_TOKEN_COOKIE_MAX_AGE_DEFAULT = 1 * 24 * 60 * 60 * 1000; // 1 day

// =====================================================
// VALIDATE TOKEN PAYLOAD
// =====================================================

const validateTokenPayload = (
  decoded: JwtPayload
): TokenPayload => {
  // ===================================================
  // USER ID / SUB
  // ===================================================

  const userId = decoded.userId || decoded.sub;

  if (
    typeof userId !== "string" ||
    !userId
  ) {
    throw new Error(
      "Invalid token userId"
    );
  }

  // ===================================================
  // ROLE
  // ===================================================

  const validRoles: UserRole[] = [
    "super_admin",
    "administrator",
    "admin",
    "employee",
    "user",
  ];

  const role = decoded.role as UserRole | undefined;

  if (role && !validRoles.includes(role)) {
    throw new Error(
      "Invalid token role"
    );
  }

  // ===================================================
  // RETURN SAFE PAYLOAD
  // ===================================================

  return {
    userId,
    sub: userId,
    ...(role ? { role } : {}),
    ...(typeof decoded.sessionId === "string"
      ? { sessionId: decoded.sessionId }
      : {}),
    ...(typeof decoded.sessionKey === "string"
      ? { sessionKey: decoded.sessionKey }
      : {}),
    ...(decoded.type === "access" || decoded.type === "refresh"
      ? { type: decoded.type }
      : {}),
    ...(typeof decoded.rememberMe === "boolean"
      ? { rememberMe: decoded.rememberMe }
      : {}),
  };
};

// =====================================================
// GET ACCESS SECRET
// =====================================================

const getAccessSecret =
  (): string => {
    const secret =
      process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_ACCESS_SECRET is missing"
      );
    }

    return secret;
  };

// =====================================================
// GET REFRESH SECRET
// =====================================================

const getRefreshSecret =
  (): string => {
    const secret =
      process.env.JWT_REFRESH_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_REFRESH_SECRET is missing"
      );
    }

    return secret;
  };

// =====================================================
// GENERATE ACCESS TOKEN
// =====================================================

export const generateAccessToken = (
  payload: TokenPayload
): string => {
  const secret =
    getAccessSecret();

  const options: SignOptions = {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    jwtid: crypto.randomBytes(16).toString("hex"),
  };

  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      sessionKey: payload.sessionKey,
      type: "access",
    },
    secret,
    options
  );
};

// =====================================================
// GENERATE REFRESH TOKEN
// =====================================================

export const generateRefreshToken = (
  payload: TokenPayload,
  rememberMe?: boolean
): string => {
  const secret =
    getRefreshSecret();

  const isRememberMe =
    typeof rememberMe === "boolean"
      ? rememberMe
      : Boolean(payload.rememberMe);

  const options: SignOptions = {
    expiresIn: isRememberMe
      ? REFRESH_TOKEN_EXPIRY_REMEMBER
      : REFRESH_TOKEN_EXPIRY_DEFAULT,
    jwtid: crypto.randomBytes(16).toString("hex"),
  };

  return jwt.sign(
    {
      sub: payload.userId,
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
      sessionKey: payload.sessionKey,
      type: "refresh",
      rememberMe: isRememberMe,
    },
    secret,
    options
  );
};

// =====================================================
// VERIFY ACCESS TOKEN
// =====================================================

export const verifyAccessToken = (
  token: string
): TokenPayload => {
  if (
    !token ||
    typeof token !== "string"
  ) {
    throw new Error(
      "Access token is required"
    );
  }

  const secret =
    getAccessSecret();

  const decoded =
    jwt.verify(
      token,
      secret
    ) as JwtPayload;

  return validateTokenPayload(
    decoded
  );
};

// =====================================================
// VERIFY REFRESH TOKEN
// =====================================================

export const verifyRefreshToken = (
  token: string
): TokenPayload => {
  if (
    !token ||
    typeof token !== "string"
  ) {
    throw new Error(
      "Refresh token is required"
    );
  }

  const secret =
    getRefreshSecret();

  const decoded =
    jwt.verify(
      token,
      secret
    ) as JwtPayload;

  return validateTokenPayload(
    decoded
  );
};

// =====================================================
// CRYPTOGRAPHIC SESSION UTILITIES
// =====================================================

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateSessionKey = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

export const parseDeviceInfo = (userAgent?: string): string => {
  if (!userAgent) return "Unknown Device";
  const ua = userAgent.toLowerCase();

  let os = "Device";
  if (ua.includes("windows")) os = "Windows PC";
  else if (ua.includes("ipad")) os = "iPad";
  else if (ua.includes("iphone")) os = "iPhone";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "Mac";
  else if (ua.includes("android")) {
    os = ua.includes("mobile") ? "Android Mobile" : "Android Tablet";
  } else if (ua.includes("linux")) os = "Linux PC";

  let browser = "Browser";
  if (ua.includes("edg/")) browser = "Edge";
  else if (ua.includes("chrome/") && !ua.includes("edg/")) browser = "Chrome";
  else if (ua.includes("safari/") && !ua.includes("chrome/")) browser = "Safari";
  else if (ua.includes("firefox/")) browser = "Firefox";

  return `${browser} on ${os}`;
};

// =====================================================
// AUTH COOKIE OPTIONS (CROSS-SITE & PRODUCTION SAFE)
// =====================================================

export const getAuthCookieOptions = (): CookieOptions => {
  const isProduction =
    process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  const sameSiteEnv = process.env.COOKIE_SAME_SITE?.toLowerCase();

  // In production across decoupled services (e.g. Render), SameSite must be "none" with Secure=true
  // In local development over HTTP, SameSite must be "lax" and Secure=false
  let sameSite: "none" | "lax" | "strict" = isProduction ? "none" : "lax";
  if (sameSiteEnv === "none" || sameSiteEnv === "lax" || sameSiteEnv === "strict") {
    sameSite = sameSiteEnv;
  }

  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : isProduction || sameSite === "none";

  const options: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};