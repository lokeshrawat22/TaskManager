import { Request, Response, NextFunction } from "express";

/**
 * CSRF Protection Middleware
 *
 * Enforces Origin / Referer and Sec-Fetch-Site verification on state-changing requests
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

  // 1. Check Sec-Fetch-Site header (modern browsers)
  const secFetchSite = req.headers["sec-fetch-site"];
  if (secFetchSite === "cross-site") {
    res.status(403).json({
      success: false,
      code: "CSRF_DETECTED",
      message: "Forbidden: Cross-site request forgery attempt detected.",
    });
    return;
  }

  // 2. Allowed origins
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const allowedOrigins: string[] = [clientUrl];

  try {
    const parsedClientUrl = new URL(clientUrl);
    allowedOrigins.push(parsedClientUrl.origin);
  } catch {
    // Ignore invalid url format
  }

  // Also include standard localhost origins during development
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5000"
    );
  }

  const origin = req.headers["origin"];
  const referer = req.headers["referer"];

  if (origin) {
    const isAllowedOrigin = allowedOrigins.some((allowed) => {
      try {
        return new URL(allowed).origin === new URL(origin).origin;
      } catch {
        return allowed === origin;
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
  } else if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      const isAllowedReferer = allowedOrigins.some((allowed) => {
        try {
          return new URL(allowed).origin === refererOrigin;
        } catch {
          return allowed === refererOrigin;
        }
      });

      if (!isAllowedReferer) {
        res.status(403).json({
          success: false,
          code: "CSRF_INVALID_REFERER",
          message: "Forbidden: Request referer does not match allowed client origin.",
        });
        return;
      }
    } catch {
      // If referer is malformed, block it on state-changing methods
      res.status(403).json({
        success: false,
        code: "CSRF_MALFORMED_REFERER",
        message: "Forbidden: Malformed request referer.",
      });
      return;
    }
  }

  next();
};
