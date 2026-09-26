"use client";

import { toast as sonnerToast, type ExternalToast } from "sonner";
import {
  CheckCircle2,
  CircleAlert,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import React from "react";

// =====================================================
// DEDUPLICATION TRACKER
// =====================================================

const recentToasts = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 1500;

function shouldThrottleToast(message: string, type: string): boolean {
  const key = `${type}:${message.trim().toLowerCase()}`;
  const now = Date.now();
  const lastTime = recentToasts.get(key);

  if (lastTime && now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return true;
  }

  recentToasts.set(key, now);

  // Periodic cleanup of stale entries
  if (recentToasts.size > 50) {
    for (const [k, time] of recentToasts.entries()) {
      if (now - time > DEDUPLICATION_WINDOW_MS * 2) {
        recentToasts.delete(k);
      }
    }
  }

  return false;
}

// =====================================================
// CUSTOM TOAST CARD COMPONENT
// =====================================================

interface ToastCardProps {
  id: string | number;
  type: "success" | "error" | "warning" | "info" | "loading";
  title?: string;
  message: string;
}

function ToastCard({ id, type, title, message }: ToastCardProps) {
  const typeConfig = {
    success: {
      bg: "bg-[#F0FDF8] dark:bg-[#082820]",
      border: "border-[#A7F3D0] dark:border-[#134E3C]",
      text: "text-[#065F46] dark:text-[#A7F3D0]",
      icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-[#059669] dark:text-[#34D399]" />,
      defaultTitle: "Success",
    },
    error: {
      bg: "bg-[#FEF2F2] dark:bg-[#2D0F12]",
      border: "border-[#FECACA] dark:border-[#5C1D24]",
      text: "text-[#991B1B] dark:text-[#FECACA]",
      icon: <CircleAlert className="h-5 w-5 shrink-0 text-[#DC2626] dark:text-[#F87171]" />,
      defaultTitle: "Error",
    },
    warning: {
      bg: "bg-[#FFFBEB] dark:bg-[#2B1D06]",
      border: "border-[#FDE68A] dark:border-[#5C3E10]",
      text: "text-[#92400E] dark:text-[#FDE68A]",
      icon: <AlertTriangle className="h-5 w-5 shrink-0 text-[#D97706] dark:text-[#FBBF24]" />,
      defaultTitle: "Warning",
    },
    info: {
      bg: "bg-[#EFF8FA] dark:bg-[#08202C]",
      border: "border-[#BAE6FD] dark:border-[#123C50]",
      text: "text-[#075985] dark:text-[#BAE6FD]",
      icon: <Info className="h-5 w-5 shrink-0 text-[#087D8F] dark:text-[#38BDF8]" />,
      defaultTitle: "Information",
    },
    loading: {
      bg: "bg-[#F8FAFC] dark:bg-[#0C1E2A]",
      border: "border-[#E2E8F0] dark:border-[#1E3B4C]",
      text: "text-[#334155] dark:text-[#E2E8F0]",
      icon: <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#087D8F] dark:text-[#4CD3DF]" />,
      defaultTitle: "Processing",
    },
  }[type];

  const hasCustomTitle = Boolean(title && title !== typeConfig.defaultTitle);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mm-toast-card pointer-events-auto flex w-[calc(100vw-32px)] sm:w-[380px] max-w-[400px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-[0_8px_24px_rgba(6,61,99,0.12)] backdrop-blur-md transition-all duration-200 dark:shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${typeConfig.bg} ${typeConfig.border}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="shrink-0 flex items-center justify-center">
          {typeConfig.icon}
        </div>
        <p className={`min-w-0 flex-1 text-[13.5px] sm:text-sm font-medium leading-snug break-words ${typeConfig.text}`}>
          {hasCustomTitle && (
            <span className="font-semibold mr-1.5 opacity-95">{title}:</span>
          )}
          {message}
        </p>
      </div>

      {type !== "loading" && (
        <button
          type="button"
          onClick={() => sonnerToast.dismiss(id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-current opacity-60 transition-all hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// =====================================================
// GLOBAL TOAST METHODS
// =====================================================

export const showToast = {
  success: (message: string, options?: { title?: string; duration?: number; id?: string }) => {
    if (!message || shouldThrottleToast(message, "success")) return;

    return sonnerToast.custom(
      (t) => (
        <ToastCard
          id={t}
          type="success"
          title={options?.title}
          message={message}
        />
      ),
      {
        duration: options?.duration || 4000,
        id: options?.id,
      }
    );
  },

  error: (message: string, options?: { title?: string; duration?: number; id?: string }) => {
    if (!message || shouldThrottleToast(message, "error")) return;

    return sonnerToast.custom(
      (t) => (
        <ToastCard
          id={t}
          type="error"
          title={options?.title}
          message={message}
        />
      ),
      {
        duration: options?.duration || 4500,
        id: options?.id,
      }
    );
  },

  warning: (message: string, options?: { title?: string; duration?: number; id?: string }) => {
    if (!message || shouldThrottleToast(message, "warning")) return;

    return sonnerToast.custom(
      (t) => (
        <ToastCard
          id={t}
          type="warning"
          title={options?.title}
          message={message}
        />
      ),
      {
        duration: options?.duration || 4000,
        id: options?.id,
      }
    );
  },

  info: (message: string, options?: { title?: string; duration?: number; id?: string }) => {
    if (!message || shouldThrottleToast(message, "info")) return;

    return sonnerToast.custom(
      (t) => (
        <ToastCard
          id={t}
          type="info"
          title={options?.title}
          message={message}
        />
      ),
      {
        duration: options?.duration || 4000,
        id: options?.id,
      }
    );
  },

  loading: (message: string, options?: { title?: string; id?: string }) => {
    return sonnerToast.custom(
      (t) => (
        <ToastCard
          id={t}
          type="loading"
          title={options?.title || "Please wait"}
          message={message}
        />
      ),
      {
        duration: Infinity,
        id: options?.id,
      }
    );
  },

  promise: async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ): Promise<T> => {
    const toastId = showToast.loading(messages.loading);

    try {
      const result = await promise;
      sonnerToast.dismiss(toastId);
      const successMsg =
        typeof messages.success === "function"
          ? messages.success(result)
          : messages.success;
      showToast.success(successMsg);
      return result;
    } catch (err: any) {
      sonnerToast.dismiss(toastId);
      const errorMsg =
        typeof messages.error === "function"
          ? messages.error(err)
          : messages.error || err?.message || "Operation failed";
      showToast.error(errorMsg);
      throw err;
    }
  },

  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};

// Aliases for quick drop-in
export const toast = showToast;
export default showToast;
