"use client";

import {
  Bell,
  CheckCheck,
  CheckSquare,
  ClipboardList,
  Loader2,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import { showToast } from "@/lib/toast";

// =====================================================
// TYPES
// =====================================================

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "TASK_OVERDUE"
  | "TASK_DEADLINE"
  | "ACCOUNT_BLOCKED"
  | "ACCOUNT_UNBLOCKED"
  | "EMPLOYEE_CREATED"
  | "EMPLOYEE_UPDATED"
  | "SYSTEM_ANNOUNCEMENT";

export interface Notification {
  _id: string;
  id?: string;
  recipient?: string;
  recipientId?: string;
  recipientRole?: "super_admin" | "administrator" | "admin" | "employee" | "user";
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType?: "task" | "user" | "system";
  relatedEntityId?: string | null;
  taskId?: string | null;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

import { API_BASE_URL } from "@/constants/api.constants";

// =====================================================
// API URL
// =====================================================

const API = (process.env.NEXT_PUBLIC_API_URL || API_BASE_URL).replace(/\/$/, "");

// =====================================================
// RELATIVE TIME HELPER
// =====================================================

export function relativeTime(
  dateStr: string,
  t?: ((key: string, params?: Record<string, unknown>) => string) | null,
  language?: string,
): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t ? (t("common.justNow") || "Just now") : "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return t ? (t("common.minAgo", { count: m }) || `${m} min ago`) : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h === 1) return language === "hi" ? "1 घंटा पहले" : "1 hour ago";
  if (h < 24) return t ? (t("common.hoursAgo", { count: h }) || `${h} hours ago`) : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return t ? (t("common.yesterday") || "Yesterday") : "Yesterday";
  if (d < 7) return t ? (t("common.daysAgo", { count: d }) || `${d} days ago`) : `${d} days ago`;
  return new Date(dateStr).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// =====================================================
// ICON PER NOTIFICATION TYPE
// =====================================================

export function NotifIcon({ type }: { type: NotificationType }) {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl";

  switch (type) {
    case "TASK_ASSIGNED":
      return (
        <div className={`${base} bg-[#EAF6F9] text-[#087D8F] dark:bg-[#12383F] dark:text-[#64D4DF]`}>
          <ClipboardList size={16} />
        </div>
      );
    case "TASK_UPDATED":
      return (
        <div className={`${base} bg-[#EEF3FF] text-[#3B5BDB] dark:bg-[#1A2A5A] dark:text-[#748FFC]`}>
          <ClipboardList size={16} />
        </div>
      );
    case "TASK_COMPLETED":
      return (
        <div className={`${base} bg-[#F0FDF4] text-[#16A34A] dark:bg-[#0B2E1A] dark:text-[#4ADE80]`}>
          <CheckSquare size={16} />
        </div>
      );
    case "TASK_OVERDUE":
    case "TASK_DEADLINE":
      return (
        <div className={`${base} bg-[#FFF8F0] text-[#C05621] dark:bg-[#2E1A0B] dark:text-[#FB923C]`}>
          <ClipboardList size={16} />
        </div>
      );
    case "ACCOUNT_BLOCKED":
      return (
        <div className={`${base} bg-[#FEF2F2] text-[#B91C1C] dark:bg-[#2E0A0A] dark:text-[#FCA5A5]`}>
          <Shield size={16} />
        </div>
      );
    case "ACCOUNT_UNBLOCKED":
      return (
        <div className={`${base} bg-[#F0FDF4] text-[#16A34A] dark:bg-[#0B2E1A] dark:text-[#4ADE80]`}>
          <Shield size={16} />
        </div>
      );
    case "EMPLOYEE_CREATED":
    case "EMPLOYEE_UPDATED":
      return (
        <div className={`${base} bg-[#F3E8FF] text-[#7E22CE] dark:bg-[#3B1754] dark:text-[#C084FC]`}>
          <UserRound size={16} />
        </div>
      );
    case "SYSTEM_ANNOUNCEMENT":
      return (
        <div className={`${base} bg-[#FEF3C7] text-[#B45309] dark:bg-[#451A03] dark:text-[#FCD34D]`}>
          <Bell size={16} />
        </div>
      );
    default:
      return (
        <div className={`${base} bg-[#EAF6F9] text-[#087D8F] dark:bg-[#12383F] dark:text-[#64D4DF]`}>
          <Bell size={16} />
        </div>
      );
  }
}

// =====================================================
// SKELETON ROW
// =====================================================

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
      <div className="h-9 w-9 shrink-0 rounded-xl bg-[#E8EFF2] dark:bg-[#1E3444]" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-3 w-28 rounded bg-[#E8EFF2] dark:bg-[#1E3444]" />
        <div className="h-2.5 w-48 rounded bg-[#EFF4F6] dark:bg-[#172E3C]" />
        <div className="h-2 w-16 rounded bg-[#EFF4F6] dark:bg-[#172E3C]" />
      </div>
    </div>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

interface NotificationDropdownProps {
  /** "employee" for employee dashboard, "admin" for admin panel */
  role: "super_admin" | "administrator" | "admin" | "employee" | "user" | string;
}

export function NotificationDropdown({ role }: NotificationDropdownProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin =
    role === "super_admin" ||
    role === "administrator" ||
    role === "admin" ||
    (typeof role === "string" &&
      (role.toLowerCase().includes("admin") ||
        role.toLowerCase().includes("super"))) ||
    (typeof pathname === "string" && pathname.startsWith("/admin"));

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const {
    unreadCount,
    setUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
  } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // ===================================================
  // FETCH NOTIFICATIONS (for dropdown)
  // ===================================================

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications?limit=20`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json?.success) {
        setNotifications(json.data?.notifications ?? []);
        // Sync unread badge from the list without extra unread-count fetch
        const unread = (json.data?.notifications ?? []).filter(
          (n: Notification) => !n.isRead,
        ).length;
        setUnreadCount(unread);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  // ===================================================
  // OPEN DROPDOWN - stop polling, load list
  // ===================================================

  const openDropdown = useCallback(() => {
    setOpen(true);
    fetchNotifications();
  }, [fetchNotifications]);

  // ===================================================
  // CLOSE DROPDOWN - restart polling via open effect
  // ===================================================

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, []);

  // ===================================================
  // CLICK OUTSIDE & ESCAPE KEY
  // ===================================================

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDropdown();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeDropdown]);

  // ===================================================
  // MARK SINGLE AS READ
  // ===================================================

  const markAsRead = useCallback(
    async (notif: Notification) => {
      if (!notif.isRead) {
        try {
          await fetch(`${API}/api/notifications/${notif._id}/read`, {
            method: "PATCH",
            credentials: "include",
          });
          setNotifications((prev) =>
            prev.map((n) =>
              n._id === notif._id ? { ...n, isRead: true } : n,
            ),
          );
          setUnreadCount((c) => Math.max(0, c - 1));
        } catch {
          // silent
        }
      }

      // Navigate to the related entity
      const targetTaskId = notif.relatedEntityId || notif.taskId;
      if (notif.relatedEntityType === "user" && isAdmin && notif.relatedEntityId) {
        closeDropdown();
        router.push(`/admin/employees/${notif.relatedEntityId}`);
      } else if (targetTaskId) {
        const detailPath =
          isAdmin
            ? `/admin/tasks/${targetTaskId}`
            : `/dashboard/tasks/${targetTaskId}`;
        closeDropdown();
        router.push(detailPath);
      }
    },
    [isAdmin, router, closeDropdown],
  );

  // ===================================================
  // MARK ALL AS READ
  // ===================================================

  const markAllAsRead = useCallback(async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const res = await fetch(`${API}/api/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showToast.success("All notifications marked as read");
    } catch {
      showToast.error("Failed to mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  }, [markingAll, unreadCount]);

  // ===================================================
  // DELETE NOTIFICATION
  // ===================================================

  const deleteNotification = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
        await fetch(`${API}/api/notifications/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        setNotifications((prev) => {
          const target = prev.find((n) => n._id === id);
          if (target && !target.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n._id !== id);
        });
      } catch {
        showToast.error("Failed to delete notification");
      }
    },
    [],
  );

  // ===================================================
  // RENDER
  // ===================================================

  const displayCount = Math.min(unreadCount, 99);

  return (
    <div className="relative">
      {/* BELL BUTTON */}
      <button
        ref={btnRef}
        type="button"
        id="notification-bell-btn"
        aria-label={t("notifications.notificationsTitle") || t("navigation.notifications") || "Notifications"}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[#C7D5DC] bg-white text-[#53707D] transition hover:bg-[#F4F9FB] hover:text-[#087D8F] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#B6C5CF] dark:hover:bg-[#102A36] dark:hover:text-[#38BDF8]"
      >
        <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />

        {/* UNREAD BADGE */}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow">
            {displayCount}
          </span>
        ) : (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#12B8C8] dark:bg-[#38BDF8]" />
        )}
      </button>

      {/* DROPDOWN PANEL */}
      {open && (
        <div
          ref={panelRef}
          id="notification-panel"
          className="
            absolute
            right-0
            top-[calc(100%+10px)]
            z-[200]
            w-[340px]
            max-w-[calc(100vw-24px)]
            overflow-hidden
            rounded-2xl
            border
            border-[#C7D5DC]
            bg-white
            shadow-[0_16px_48px_rgba(6,61,99,0.16)]
            dark:border-[#1E3A47]
            dark:bg-[#0B202B]
            dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]
          "
        >
          {/* PANEL HEADER */}
          <div className="flex items-center justify-between border-b border-[#CCD8DF] px-4 py-3.5 dark:border-[#1E3A47]">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[#087D8F] dark:text-[#38BDF8]" />
              <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                {t("notifications.notificationsTitle") || t("navigation.notifications") || "Notifications"}
              </h3>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10.5px] font-semibold text-white">
                  {displayCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  disabled={markingAll}
                  title="Mark all as read"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#087D8F] transition hover:bg-[#EAF6F9] disabled:opacity-50 dark:text-[#4CD3DF] dark:hover:bg-[#12383F]"
                >
                  {markingAll ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCheck size={12} />
                  )}
                  <span>{t("notifications.markAllRead") || "Mark all read"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={closeDropdown}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[#8A9AA3] transition hover:bg-[#F3F7F8] dark:hover:bg-[#18333F]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* NOTIFICATION LIST */}
          <div className="max-h-[380px] overflow-y-auto">
            {loading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF6F9] dark:bg-[#12383F]">
                  <Bell size={22} className="text-[#087D8F] dark:text-[#4CD3DF]" />
                </div>
                <p className="text-sm font-bold text-[#315364] dark:text-[#D7E7EC]">
                  {t("notifications.allCaughtUp") || "You're all caught up"}
                </p>
                <p className="text-xs text-[#718894] dark:text-[#8FA8B2]">
                  {t("notifications.noNewNotifications") || "No new notifications"}
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => markAsRead(notif)}
                  className={`
                    group relative flex cursor-pointer items-start gap-3 px-4 py-3.5
                    transition hover:bg-[#F5FAFB] dark:hover:bg-[#102A36]
                    ${!notif.isRead ? "bg-[#F0F9FC] dark:bg-[#0C3345]/50" : ""}
                    border-b border-[#D1DDE3] last:border-b-0 dark:border-[#18333F]
                  `}
                >
                  {/* ICON */}
                  <NotifIcon type={notif.type} />

                  {/* CONTENT */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold leading-snug ${
                          notif.isRead
                            ? "text-[#475569] dark:text-[#B6C5CF]"
                            : "text-[#0F172A] dark:text-[#F8FAFC]"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#087D8F] dark:bg-[#38BDF8]" />
                      )}
                    </div>

                    <p className="mt-0.5 text-[11px] leading-4 text-[#64748B] line-clamp-2 dark:text-[#8EA5B2]">
                      {notif.message}
                    </p>

                    <p className="mt-1.5 text-[10.5px] font-medium text-[#94A3B8] dark:text-[#7F96A3]">
                      {relativeTime(notif.createdAt, t, language)}
                    </p>
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => deleteNotification(e, notif._id)}
                    title={t("common.delete") || "Delete"}
                    className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-lg text-[#9AAAB2] opacity-0 transition hover:bg-[#FEE2E2] hover:text-[#B91C1C] group-hover:flex group-hover:opacity-100 dark:hover:bg-[#321820] dark:hover:text-[#FB7185]"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* PANEL FOOTER */}
          <div className="flex items-center justify-between border-t border-[#CCD8DF] bg-[#F8FBFC] px-4 py-2.5 dark:border-[#1E3A47] dark:bg-[#081A24]">
            <span className="text-[11px] font-medium text-[#64748B] dark:text-[#8EA5B2]">
              {unreadCount > 0
                ? t("notifications.unreadCount", { count: unreadCount }) || `${unreadCount} unread`
                : t("notifications.allRead") || "All read"}
            </span>

            <button
              type="button"
              onClick={() => {
                closeDropdown();
                router.push(
                  isAdmin
                    ? "/admin/notifications"
                    : "/dashboard/notifications",
                );
              }}
              className="text-xs font-semibold text-[#087D8F] transition hover:text-[#063D63] hover:underline dark:text-[#38BDF8] dark:hover:text-[#0EA5E9]"
            >
              {t("common.viewAll") || "View all"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
