import { Request, Response, NextFunction } from "express";

/**
 * Parses and returns a sanitized, deduplicated list of allowed origins
 * based on environment configuration (CLIENT_URL, FRONTEND_URL, ALLOWED_ORIGINS).
 */
export const getAllowedOrigins = (): string[] => {
  const envOrigins = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
    "https://taskmanager-1-lw5v.onrender.com",
  ];

  const origins: string[] = [];

  for (const raw of envOrigins) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      origins.push(new URL(trimmed).origin);
    } catch {
      origins.push(trimmed.replace(/\/$/, ""));
    }
  }

  // Include localhost during development if not on Render production
  if (process.env.NODE_ENV !== "production" && process.env.RENDER !== "true") {
    origins.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5000"
    );
  }

  return Array.from(new Set(origins));
};

/**
 * CSRF Protection Middleware
 *
 * Enforces Origin / Referer and Fetch-Metadata verification on state-changing requests
 * (POST, PUT, PATCH, DELETE) to protect authenticated sessions from Cross-Site Request Forgery.
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  const secFetchSite = req.headers["sec-fetch-site"];
  const secFetchMode = req.headers["sec-fetch-mode"];
  const secFetchDest = req.headers["sec-fetch-dest"];

  // 1. Block top-level navigation / document-embedding requests targeting API mutation endpoints
  // Legitimate API fetch requests from SPAs have sec-fetch-mode: "cors"
  if (secFetchMode === "navigate" || secFetchDest === "document" || secFetchDest === "embed") {
    res.status(403).json({
      success: false,
      code: "CSRF_DETECTED",
      message: "Forbidden: Cross-site navigation request forgery attempt detected.",
    });
    return;
  }

  // 2. Extract Origin or Referer
  const rawOrigin = req.headers["origin"] as string | undefined;
  const rawReferer = req.headers["referer"] as string | undefined;

  let requestOrigin: string | null = null;

  if (rawOrigin) {
    try {
      requestOrigin = new URL(rawOrigin).origin;
    } catch {
      requestOrigin = rawOrigin;
    }
  } else if (rawReferer) {
    try {
      requestOrigin = new URL(rawReferer).origin;
    } catch {
      res.status(403).json({
        success: false,
        code: "CSRF_MALFORMED_REFERER",
        message: "Forbidden: Malformed request referer.",
      });
      return;
    }
  }

  // 3. If Sec-Fetch-Site is "cross-site", an Origin or Referer is mandatory
  if (secFetchSite === "cross-site" && !requestOrigin) {
    res.status(403).json({
      success: false,
      code: "CSRF_DETECTED",
      message: "Forbidden: Cross-site request forgery attempt detected.",
    });
    return;
  }

  // 4. Validate Origin / Referer against allowed origins
  if (requestOrigin) {
    const isAllowedOrigin = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === requestOrigin;
      } catch {
        return allowed === requestOrigin;
      }
    });

    if (!isAllowedOrigin) {
      res.status(403).json({
        success: false,
        code: "CSRF_INVALID_ORIGIN",
        message: "Forbidden: Request origin does not match allowed client origin.",
      });
      return;
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, require Origin or Referer on state-changing API requests
    res.status(403).json({
      success: false,
      code: "CSRF_MISSING_ORIGIN",
      message: "Forbidden: Missing request origin.",
    });
    return;
  }

  next();
};
