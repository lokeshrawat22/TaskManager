// =====================================================
// CENTRAL API SERVICE
// =====================================================

import { refreshAccessToken, handleBlockedEmployeeLogout } from "./auth.service";
import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// API URL
// =====================================================

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

// =====================================================
// REQUEST TIMEOUT
// =====================================================

const REQUEST_TIMEOUT = 15000;

// =====================================================
// REFRESH LOCK & SESSION STATE
// =====================================================

let refreshPromise: Promise<boolean> | null = null;
let sessionTerminated = false;

export const resetSessionState = (): void => {
  sessionTerminated = false;
};

// =====================================================
// SAFE REFRESH
// =====================================================

const refreshTokenSafely = async (): Promise<boolean> => {
  if (sessionTerminated) {
    console.log("[AUTH-DIAG] refreshTokenSafely skipped: Session is already terminated");
    return false;
  }

  if (!refreshPromise) {
    console.log("[AUTH-DIAG] Initiating access token refresh...");

    refreshPromise = refreshAccessToken()
      .then((success) => {
        if (!success) {
          sessionTerminated = true;
          console.log("[AUTH-DIAG] Access token refresh failed. Terminating session cache.");
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("user");
            } catch {
              // ignore
            }
          }
        } else {
          sessionTerminated = false;
          console.log("[AUTH-DIAG] Access token refresh succeeded. Session active.");
        }
        return success;
      })
      .catch((error) => {
        sessionTerminated = true;
        console.log(
          "[AUTH-DIAG] Refresh token request threw an error (not token values):",
          error?.message ?? error,
        );
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("user");
          } catch {
            // ignore
          }
        }
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  } else {
    console.log(
      "[AUTH-DIAG] Refresh already in-flight — queuing behind existing request",
    );
  }

  return refreshPromise;
};

// =====================================================
// DEDUPLICATION MAP FOR IN-FLIGHT GET REQUESTS
// =====================================================

const inFlightGetRequests = new Map<string, Promise<any>>();

export interface ApiRequestOptions extends RequestInit {
  skipDedupe?: boolean;
  skipRefresh?: boolean;
  silent?: boolean;
}

// =====================================================
// API REQUEST
// =====================================================

export const apiRequest = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  retry = true,
): Promise<T> => {
  // ===================================================
  // CHECK API URL
  // ===================================================

  if (!API_URL) {
    console.error(
      "[API] NEXT_PUBLIC_API_URL is missing.",
    );

    throw new Error(
      "API URL is not configured.",
    );
  }

  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";

  const requestUrl =
    `${API_URL.replace(/\/$/, "")}/${endpoint.replace(
      /^\//,
      "",
    )}`;

  const cacheKey = `${method}:${requestUrl}`;
  const shouldDedupe = isGet && !options.skipDedupe;

  // If identical GET request is already in-flight, coalesce behind it
  if (shouldDedupe && inFlightGetRequests.has(cacheKey)) {
    const existingPromise = inFlightGetRequests.get(cacheKey)!;

    if (options.signal) {
      if (options.signal.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
          reject(new DOMException("The user aborted a request.", "AbortError"));
        };
        options.signal!.addEventListener("abort", onAbort, { once: true });
        existingPromise
          .then((result) => {
            options.signal!.removeEventListener("abort", onAbort);
            resolve(result);
          })
          .catch((err) => {
            options.signal!.removeEventListener("abort", onAbort);
            reject(err);
          });
      });
    }

    return existingPromise as Promise<T>;
  }

  // ===================================================
  // CREATE ABORT CONTROLLER & TIMEOUT
  // ===================================================

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, REQUEST_TIMEOUT);

  let callerAbortListener: (() => void) | null = null;
  if (options.signal && !shouldDedupe) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      controller.abort(options.signal.reason);
    } else {
      callerAbortListener = () => {
        controller.abort(options.signal!.reason);
      };
      options.signal.addEventListener("abort", callerAbortListener, { once: true });
    }
  }

  const executeFetch = async (): Promise<T> => {
    try {
      if (process.env.NODE_ENV === "development" && !options.silent) {
        console.log(
          "[API] Request:",
          method,
          requestUrl,
        );
      }

      // =================================================
      // FETCH
      // =================================================

      const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

      const response = await fetch(requestUrl, {
        ...options,
        credentials: "include",
        signal: controller.signal,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(options.headers || {}),
        },
      });

      if (process.env.NODE_ENV === "development" && !options.silent) {
        console.log(
          "[API] Response:",
          response.status,
          requestUrl,
        );
      }

    // =================================================
    // RESPONSE BODY
    // =================================================

    const contentType =
      response.headers.get(
        "content-type",
      );

    let data: any = null;

    // =================================================
    // JSON RESPONSE
    // =================================================

    if (
      contentType?.includes(
        "application/json",
      )
    ) {
      try {
        data =
          await response.json();
      } catch (error) {
        console.error(
          "[API] Failed to parse JSON response:",
          error,
        );

        throw new Error(
          "Invalid response received from server.",
        );
      }
    }

    // =================================================
    // NON-JSON RESPONSE
    // =================================================

    else {
      const text =
        await response.text();

      let cleanMessage = text;
      if (text && (text.includes("<!DOCTYPE") || text.includes("<html") || text.trim().startsWith("<"))) {
        const match = text.match(/<pre>(.*?)<\/pre>/i) || text.match(/<title>(.*?)<\/title>/i);
        cleanMessage = match
          ? match[1].replace(/<[^>]+>/g, "").trim()
          : response.status === 404
          ? "The requested endpoint was not found on the server."
          : `Request failed with status ${response.status}`;
      }

      data = cleanMessage
        ? {
            message: cleanMessage,
          }
        : null;
    }

    // =================================================
    // ACCOUNT BLOCKED HANDLING (IMMEDIATE LOGOUT)
    // =================================================

    const isTargetBlockAction = endpoint.includes("/block");
    if (data?.code === "ACCOUNT_BLOCKED" && !isTargetBlockAction) {
      handleBlockedEmployeeLogout(data?.message);
      const apiError: any = new Error(
        data?.message || "Your account has been blocked by an administrator."
      );
      apiError.status = response.status;
      apiError.code = "ACCOUNT_BLOCKED";
      apiError.data = data;
      throw apiError;
    }

    // =================================================
    // ACCESS TOKEN EXPIRED / SILENT REFRESH
    // =================================================

    const isRefreshExcluded =
      endpoint.includes("/auth/refresh-token") ||
      endpoint.includes("/auth/refresh-access-token") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/register") ||
      endpoint.includes("/auth/forgot-password") ||
      endpoint.includes("/auth/reset-password") ||
      endpoint.includes("/auth/encryption-key") ||
      endpoint.includes("/auth/verify-");

    if (
      response.status === 401 &&
      retry &&
      !options.skipRefresh &&
      !isRefreshExcluded &&
      !sessionTerminated
    ) {
      console.log(
        `[AUTH-DIAG] Access token expired or missing (401) on ${endpoint}. Attempting silent refresh before retry...`
      );

      const refreshed = await refreshTokenSafely();

      if (refreshed) {
        console.log(
          `[AUTH-DIAG] Access token refreshed successfully ✓ — retrying original request: ${endpoint}`
        );

        return await apiRequest<T>(
          endpoint,
          options,
          false,
        );
      }

      console.log(
        `[AUTH-DIAG] Refresh token expired or invalid — cannot refresh session for ${endpoint}.`
      );
    }

    // =================================================
    // API ERROR
    // =================================================

    if (!response.ok) {
      // Only log out if the server explicitly indicates that the CURRENT user's account is blocked.
      // 1. Do NOT log out on 403 permission/business errors (e.g., target user cannot be blocked).
      // 2. Do NOT log out when calling an administrative block endpoint on another user.
      // 3. Only trigger logout when the authenticated session itself is rejected with code "ACCOUNT_BLOCKED".
      const isTargetBlockAction = endpoint.includes("/block");
      if (
        response.status === 403 &&
        data?.code === "ACCOUNT_BLOCKED" &&
        !isTargetBlockAction
      ) {
        handleBlockedEmployeeLogout(data?.message);
      }

      // Expected unauthenticated probes (e.g. background session check when logged out) should not spam console.error
      const isExpectedAuthProbe =
        response.status === 401 &&
        (endpoint.includes("/auth/me") ||
          endpoint.includes("/auth/profile") ||
          endpoint.includes("/auth/refresh-token") ||
          endpoint.includes("/auth/refresh-access-token"));

      if (!isExpectedAuthProbe && !options.silent) {
        console.error(
          "[API] Request failed:",
          {
            status: response.status,
            endpoint,
            data,
          },
        );
      }

      let rawMessage =
        data?.message || `Request failed with status ${response.status}`;
      if (
        typeof rawMessage === "string" &&
        (rawMessage.includes("<!DOCTYPE") ||
          rawMessage.includes("<html") ||
          rawMessage.trim().startsWith("<"))
      ) {
        const match =
          rawMessage.match(/<pre>(.*?)<\/pre>/i) ||
          rawMessage.match(/<title>(.*?)<\/title>/i);
        rawMessage = match
          ? match[1].replace(/<[^>]+>/g, "").trim()
          : response.status === 404
          ? "The requested endpoint was not found on the server."
          : `Request failed with status ${response.status}`;
      }

      const apiError: any = new Error(rawMessage);
      apiError.status = response.status;
      apiError.data = data;
      throw apiError;
    }

    // =================================================
    // SUCCESS
    // =================================================

    return data as T;
    } catch (error: any) {
      // =================================================
      // REQUEST ABORT / TIMEOUT
      // =================================================

      if (error?.name === "AbortError") {
        if (options.signal?.aborted && !timedOut) {
          throw error;
        }

        if (timedOut) {
          console.error(
            "[API] Request timeout:",
            endpoint,
          );

          throw new Error(
            "Request timed out. Please check your server connection.",
          );
        }

        throw error;
      }

      // =================================================
      // NETWORK ERROR
      // =================================================

      if (error instanceof TypeError) {
        console.error("[API] Network error:", error);

        // If the device is offline, ensure the global offline event is dispatched
        if (
          typeof window !== "undefined" &&
          typeof navigator !== "undefined" &&
          !navigator.onLine
        ) {
          window.dispatchEvent(new Event("offline"));
        }

        throw new Error(
          "Unable to connect to the server. Please try again.",
        );
      }

      // =================================================
      // OTHER ERROR
      // =================================================

      const isExpectedAuthProbe =
        error?.status === 401 &&
        (endpoint.includes("/auth/me") ||
          endpoint.includes("/auth/profile") ||
          endpoint.includes("/auth/refresh-token") ||
          endpoint.includes("/auth/refresh-access-token"));

      if (!isExpectedAuthProbe) {
        console.error(
          "[API] Request error:",
          error,
        );
      }

      throw error;
    } finally {
      // =================================================
      // CLEAR TIMEOUT & ABORT LISTENER
      // =================================================

      clearTimeout(timeoutId);
      if (callerAbortListener && options.signal) {
        options.signal.removeEventListener("abort", callerAbortListener);
      }
    }
  };

  const fetchPromise = executeFetch();

  if (shouldDedupe) {
    inFlightGetRequests.set(cacheKey, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (shouldDedupe) {
      inFlightGetRequests.delete(cacheKey);
    }
  }
};