"use client";

import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Filter,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";
import {
  NotifIcon,
  Notification,
  relativeTime,
} from "@/components/NotificationDropdown";
import { API_BASE_URL } from "@/constants/api.constants";

const API = (process.env.NEXT_PUBLIC_API_URL || API_BASE_URL).replace(/\/$/, "");

interface NotificationsPageViewProps {
  role: "super_admin" | "administrator" | "admin" | "employee" | "user" | string;
}

export default function NotificationsPageView({ role }: NotificationsPageViewProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  // Treat Super Admin and Administrator as admin-level notification viewers.
  const isAdminRole =
    role === "super_admin" ||
    role === "administrator" ||
    role === "admin" ||
    (typeof role === "string" &&
      (role.toLowerCase().includes("admin") ||
        role.toLowerCase().includes("super"))) ||
    (typeof pathname === "string" && pathname.startsWith("/admin"));

  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [search, setSearch] = useState("");

  // ===================================================
  // FETCH NOTIFICATIONS
  // ===================================================

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/notifications?filter=${filter}&limit=50`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(t("notifications.unableToLoad") || "Unable to load notifications. Please try again.");
      }

      const json = await res.json();
      if (json?.success) {
        setNotifications(json.data?.notifications ?? []);
        setUnreadCount(json.data?.unreadCount ?? 0);
        setTotalCount(json.data?.pagination?.total ?? 0);
      } else {
        throw new Error(json?.message || t("notifications.unableToLoad") || "Unable to load notifications.");
      }
    } catch (err: any) {
      setError(err?.message || t("notifications.unableToLoad") || "Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ===================================================
  // MARK AS READ
  // ===================================================

  const handleMarkAsRead = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await fetch(`${API}/api/notifications/${notif._id}/read`, {
          method: "PATCH",
          credentials: "include",
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        showToast.success(t("notifications.notifMarkedAsRead") || "Notification marked as read");
      } catch {
        // silent
      }
    }

    // Navigation based on related entity
    const targetTaskId = notif.relatedEntityId || notif.taskId;
    if (notif.relatedEntityType === "user" && isAdminRole && notif.relatedEntityId) {
      router.push(`/admin/employees/${notif.relatedEntityId}`);
    } else if (targetTaskId) {
      const detailPath =
        isAdminRole
          ? `/admin/tasks/${targetTaskId}`
          : `/dashboard/tasks/${targetTaskId}`;
      router.push(detailPath);
    }
  };

  // ===================================================
  // MARK ALL AS READ
  // ===================================================

  const handleMarkAllAsRead = async () => {
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
      showToast.success(t("notifications.allNotifsMarkedAsRead") || "All notifications marked as read");
    } catch {
      showToast.error(t("notifications.failedToMarkAsRead") || "Failed to mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  // ===================================================
  // DELETE NOTIFICATION
  // ===================================================

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/notifications/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === id);
        if (target && !target.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n._id !== id);
      });
      showToast.success(t("notifications.notifDeleted") || "Notification deleted");
    } catch {
      showToast.error(t("notifications.failedToDelete") || "Failed to delete notification");
    }
  };

  // Filtered by local search query
  const filtered = notifications.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative min-h-[calc(100vh-64px)] bg-[#F8FAFC] transition-colors duration-200 dark:bg-[#071923]">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER SECTION */}
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2563EB] dark:text-[#38BDF8]">
              {isAdminRole
                ? t("notifications.administration") || "ADMINISTRATION"
                : t("notifications.workspace") || "WORKSPACE"}
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#FFFFFF]">
              {t("notifications.notificationsTitle") || "Notifications"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
              {t("notifications.notificationsSubtitle") ||
                "Stay informed about task assignments, deadlines, status updates, and workspace announcements."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-2 text-xs font-semibold text-[#2563EB] shadow-sm transition hover:border-[#2563EB] hover:bg-[#EFF6FF] disabled:opacity-50 dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8] dark:hover:bg-[#0C3345]"
              >
                {markingAll ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCheck size={14} />
                )}
                <span>{t("notifications.markAllAsRead") || "Mark all as read"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={fetchNotifications}
              title={t("reports.refresh") || t("common.refresh") || "Refresh"}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#CBD5E1] bg-white text-[#64748B] shadow-sm transition hover:bg-[#F8FAFC] hover:text-[#2563EB] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#94A3B8] dark:hover:bg-[#0C3345] dark:hover:text-[#38BDF8]"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* CONTROLS: FILTERS & SEARCH */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* FILTER TABS */}
          <div className="flex rounded-xl border border-[#CBD5E1] bg-white p-1 shadow-sm dark:border-[#1E3A47] dark:bg-[#0B202B]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-[#2563EB] text-white shadow-sm dark:bg-[#2563EB] dark:text-white"
                  : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <span>{t("notifications.all") || "All"}</span>
              {totalCount > 0 && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  filter === "all" ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#64748B] dark:bg-[#1E3A47] dark:text-[#94A3B8]"
                }`}>
                  {totalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("unread")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "unread"
                  ? "bg-[#2563EB] text-white shadow-sm dark:bg-[#2563EB] dark:text-white"
                  : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <span>{t("notifications.unread") || "Unread"}</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("read")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "read"
                  ? "bg-[#2563EB] text-white shadow-sm dark:bg-[#2563EB] dark:text-white"
                  : "text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
              }`}
            >
              <span>{t("notifications.read") || "Read"}</span>
            </button>
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("notifications.searchPlaceholder") || "Search notifications..."}
              className="h-10 w-full rounded-xl border border-[#CBD5E1] bg-white pl-9 pr-8 text-xs font-medium text-[#0F172A] placeholder-[#94A3B8] shadow-sm outline-none transition focus:border-[#2563EB] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#FFFFFF] dark:placeholder-[#64748B] dark:focus:border-[#38BDF8]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* MAIN LIST CARD */}
        <div className="overflow-hidden rounded-2xl border border-[#CBD5E1] bg-white shadow-sm dark:border-[#1E3A47] dark:bg-[#0B202B]">
          {/* LOADING STATE */}
          {loading ? (
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A47]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-5 animate-pulse">
                  <div className="h-11 w-11 shrink-0 rounded-2xl bg-[#E2E8F0] dark:bg-[#1E3A47]" />
                  <div className="flex-1 space-y-2.5 pt-1">
                    <div className="h-3.5 w-48 rounded bg-[#E2E8F0] dark:bg-[#1E3A47]" />
                    <div className="h-3 w-80 rounded bg-[#F1F5F9] dark:bg-[#122834]" />
                    <div className="h-2.5 w-24 rounded bg-[#F1F5F9] dark:bg-[#122834]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* ERROR STATE */
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#341215] dark:text-[#FCA5A5]">
                <X size={24} />
              </div>
              <p className="text-base font-bold text-[#991B1B] dark:text-[#FCA5A5]">
                {error}
              </p>
              <button
                type="button"
                onClick={fetchNotifications}
                className="mt-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#1D4ED8]"
              >
                {t("notifications.retry") || "Retry"}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            /* EMPTY STATE */
            <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#2563EB] shadow-sm dark:bg-[#0C3345] dark:text-[#38BDF8]">
                <Bell size={28} />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#FFFFFF]">
                {t("notifications.allCaughtUp") || "You're all caught up"}
              </h3>
              <p className="max-w-sm text-xs leading-5 text-[#64748B] dark:text-[#94A3B8]">
                {t("notifications.noNotificationsToShow") || "No notifications to show."}
              </p>
            </div>
          ) : (
            /* NOTIFICATION LIST */
            <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E3A47]">
              {filtered.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleMarkAsRead(notif)}
                  className={`
                    group relative flex cursor-pointer items-start gap-4 p-4 sm:p-5 transition
                    hover:bg-[#F8FAFC] dark:hover:bg-[#102A38]
                    ${!notif.isRead ? "bg-[#EFF6FF]/40 dark:bg-[#0C3345]/30" : ""}
                  `}
                >
                  {/* ICON */}
                  <NotifIcon type={notif.type} />

                  {/* DETAILS */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            notif.isRead
                              ? "text-[#475569] dark:text-[#CBD5E1]"
                              : "text-[#0F172A] dark:text-white"
                          }`}
                        >
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB] dark:bg-[#38BDF8]" />
                        )}
                      </div>

                      <span className="shrink-0 text-xs font-medium text-[#94A3B8] dark:text-[#64748B]">
                        {relativeTime(notif.createdAt, t, language)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                      {notif.message}
                    </p>

                    {(notif.relatedEntityId || notif.taskId) && (
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] transition hover:border-[#2563EB] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#38BDF8]">
                          {t("notifications.viewDetails") || "View details →"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DELETE BUTTON */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, notif._id)}
                    title={t("notifications.deleteNotification") || "Delete notification"}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#94A3B8] opacity-0 transition hover:bg-[#FEE2E2] hover:text-[#B91C1C] group-hover:opacity-100 dark:hover:bg-[#450A0A] dark:hover:text-[#FCA5A5]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
