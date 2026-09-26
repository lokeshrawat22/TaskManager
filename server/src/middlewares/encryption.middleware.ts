import type { Request, Response, NextFunction } from "express";
import {
  decryptWithCustomKey,
  resolveEphemeralSessionKey,
  isEncrypted,
  safeDecryptSensitiveData,
} from "../services/encryption.service.js";
import { auditLog } from "../utils/auditLogger.js";

/**
 * Middleware that decrypts field-level AES-256-GCM login payloads.
 *
 * Desired payload structure from frontend:
 * {
 *   "identifier": "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>",
 *   "password": "v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>",
 *   "rememberMe": false
 * }
 *
 * Runs BEFORE rate limiting and authentication controllers so that:
 * 1. Plaintext email and password NEVER appear in the HTTP request payload or in Chrome DevTools.
 * 2. `identifier` is decrypted BEFORE database user lookup and account-aware rate limiting.
 * 3. `password` is decrypted in temporary memory for bcrypt verification, never stored with AES.
 * 4. Legitimate backward-compatible requests with plaintext credentials still pass through seamlessly.
 */
export const decryptLoginPayload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const body = req.body || {};
  let { identifier, password, payload, data, keyId } = body;

  // Resolve keyId from HTTP headers, HttpOnly cookie, or request body
  const effectiveKeyId =
    (req.headers["x-login-key-id"] as string | undefined) ||
    req.cookies?.loginKeyId ||
    keyId;

  // Case 1: Whole-payload encrypted structure { data: "v1:..." } or legacy { payload: "v1:..." }
  const encryptedBlob =
    (typeof data === "string" && data.trim())
      ? data.trim()
      : (typeof payload === "string" && payload.trim())
      ? payload.trim()
      : null;

  if (encryptedBlob) {
    try {
      if (!effectiveKeyId) {
        res.status(400).json({
          success: false,
          code: "MISSING_KEY_ID",
          message: "Login encryption session identifier is missing. Please refresh and try again.",
        });
        return;
      }
      let decryptedJson: string | null = null;
      try {
        const { key } = resolveEphemeralSessionKey(effectiveKeyId);
        decryptedJson = decryptWithCustomKey(encryptedBlob, key);
      } catch (err: any) {
        if (err?.code === "KEY_EXPIRED") throw err;
        decryptedJson = safeDecryptSensitiveData(encryptedBlob) || null;
      }

      if (!decryptedJson) {
        throw new Error("Failed to decrypt login payload");
      }

      const credentials = JSON.parse(decryptedJson);

      const resolvedEmailOrId =
        typeof credentials.email === "string" && credentials.email.trim()
          ? credentials.email.trim()
          : typeof credentials.identifier === "string" && credentials.identifier.trim()
          ? credentials.identifier.trim()
          : "";

      req.body.identifier = resolvedEmailOrId;
      req.body.email = resolvedEmailOrId;
      req.body.password = typeof credentials.password === "string" ? credentials.password : "";
      req.body.rememberMe = typeof credentials.rememberMe === "boolean" ? credentials.rememberMe : false;

      delete (req.body as any).payload;
      delete (req.body as any).data;
      delete (req.body as any).keyId;
      return next();
    } catch (err: any) {
      const isExpired = err?.code === "KEY_EXPIRED";
      res.status(400).json({
        success: false,
        code: isExpired ? "SESSION_EXPIRED" : "DECRYPTION_FAILED",
        message: isExpired
          ? "Your login session has expired. Please refresh the page and try again."
          : "Failed to decrypt login payload. Please try again.",
      });
      return;
    }
  }

  // Case 2: Field-Level Encryption { identifier: "v1:...", password: "v1:...", rememberMe: false }
  const isIdentifierEncrypted = isEncrypted(identifier);
  const isPasswordEncrypted = isEncrypted(password);

  // If neither field is encrypted (e.g. legacy/development/automated test), pass through
  if (!isIdentifierEncrypted && !isPasswordEncrypted) {
    return next();
  }

  try {
    let sessionKey: string | null = null;
    if (effectiveKeyId) {
      const resolved = resolveEphemeralSessionKey(effectiveKeyId);
      sessionKey = resolved.key;
    }

    // Decrypt identifier
    if (isIdentifierEncrypted) {
      let decryptedIdentifier: string | null = null;
      if (sessionKey) {
        try {
          decryptedIdentifier = decryptWithCustomKey(identifier, sessionKey);
        } catch {
          // Fallback to server key if encrypted with master key
          decryptedIdentifier = safeDecryptSensitiveData(identifier) || null;
        }
      } else {
        decryptedIdentifier = safeDecryptSensitiveData(identifier) || null;
      }

      if (!decryptedIdentifier) {
        throw new Error("Failed to decrypt identifier");
      }
      req.body.identifier = decryptedIdentifier.trim();
    }

    // Decrypt password
    if (isPasswordEncrypted) {
      let decryptedPassword: string | null = null;
      if (sessionKey) {
        try {
          decryptedPassword = decryptWithCustomKey(password, sessionKey);
        } catch {
          // Fallback to server key if encrypted with master key
          decryptedPassword = safeDecryptSensitiveData(password) || null;
        }
      } else {
        decryptedPassword = safeDecryptSensitiveData(password) || null;
      }

      if (!decryptedPassword) {
        throw new Error("Failed to decrypt password");
      }
      req.body.password = decryptedPassword;
    }

    // Clean up keyId if it was in body
    if ((req.body as any).keyId) {
      delete (req.body as any).keyId;
    }

    return next();
  } catch (error: any) {
    const isExpired = error?.code === "KEY_EXPIRED";
    auditLog("AUTH_LOGIN_FAILED", "FAILURE", req, {
      details: {
        reason: isExpired ? "Expired encryption session" : "Failed to decrypt login fields",
      },
    });

    res.status(400).json({
      success: false,
      code: isExpired ? "SESSION_EXPIRED" : "DECRYPTION_FAILED",
      message: isExpired
        ? "Your login session has expired. Please refresh the page and try again."
        : "Failed to decrypt login credentials. Please refresh and try again.",
    });
  }
};
