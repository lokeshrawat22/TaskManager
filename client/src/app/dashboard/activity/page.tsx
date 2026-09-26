"use client";

import {
  Activity,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  CircleCheck,
  CircleDot,
  Clock3,
  Filter,
  ListTodo,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  X,
  ArrowUpRight,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getEmployeeDashboard } from "@/service/dashboard.service";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  StatCard,
  Pagination,
  LoadingState,
  EmptyState,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type Task = {
  _id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ActivityItem = {
  id: string;
  type: string;
  category: "TASKS" | "ACCOUNT" | "SECURITY";
  title: string;
  description: string;
  timestamp: string;
  badge: string;
  badgeClass: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  href: string;
};

// =====================================================
// HELPERS
// =====================================================

function formatRelativeTime(dateString?: string, language: string = "en"): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return language === "hi" ? "अभी-अभी" : "Just now";
  }
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return language === "hi" ? `${minutes} मिनट पहले` : `${minutes}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return language === "hi" ? `${hours} घंटे पहले` : `${hours}h ago`;
  }
  if (diffInSeconds < 172800) {
    return language === "hi" ? "कल" : "Yesterday";
  }
  const days = Math.floor(diffInSeconds / 86400);
  if (days < 30) {
    return language === "hi" ? `${days} दिन पहले` : `${days}d ago`;
  }

  return date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFullDate(dateString?: string, language: string = "en"): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =====================================================
// EMPLOYEE ACTIVITY PAGE COMPONENT
// =====================================================

export default function ActivityPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<any>(currentUser || null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | "TASKS" | "ACCOUNT" | "SECURITY">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [dashRes, tasksRes] = await Promise.allSettled([
        getEmployeeDashboard(),
        apiRequest<any>("/api/tasks/my?limit=200", { method: "GET" }),
      ]);

      let myTasks: Task[] = [];
      if (tasksRes.status === "fulfilled" && tasksRes.value?.success) {
        myTasks = tasksRes.value.data?.tasks || [];
      }

      let user: any = currentUser || null;
      if (dashRes.status === "fulfilled" && dashRes.value?.success) {
        user = dashRes.value.data?.user || user;
      }

      setTasksList(myTasks);
      setUserProfile(user);
    } catch (err: any) {
      setError(err?.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Build Comprehensive Activity Stream
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];
    const nowTime = Date.now();

    tasksList.forEach((t: Task) => {
      const statusNorm = t.status?.toUpperCase() || "";
      const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      const updatedTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;

      // Completed
      if (statusNorm === "COMPLETED") {
        const time = updatedTime || createdTime || nowTime;
        items.push({
          id: `completed-${t._id}`,
          type: "task_completed",
          category: "TASKS",
          title: "Task Completed",
          description: `Successfully closed task "${t.title}"`,
          timestamp: new Date(time).toISOString(),
          badge: "Completed",
          badgeClass: "bg-[#ECFDF5] text-[#00875A] border-emerald-300 dark:bg-[#064E3B]/60 dark:text-[#34D399] dark:border-emerald-700",
          icon: <CircleCheck size={16} />,
          iconBg: "bg-[#ECFDF5] text-[#00875A] dark:bg-[#064E3B] dark:text-[#34D399]",
          iconColor: "text-[#00875A] dark:text-[#34D399]",
          href: `/dashboard/tasks/${t._id}`,
        });
      }

      // In Progress
      if (statusNorm === "IN_PROGRESS") {
        const time = updatedTime || createdTime || nowTime;
        items.push({
          id: `progress-${t._id}`,
          type: "task_status",
          category: "TASKS",
          title: "Status Changed to In Progress",
          description: `Work actively ongoing on "${t.title}"`,
          timestamp: new Date(time).toISOString(),
          badge: "In Progress",
          badgeClass: "bg-[#EFF6FF] text-[#0284C7] border-sky-300 dark:bg-[#1E3A5F]/60 dark:text-[#38BDF8] dark:border-sky-700",
          icon: <RefreshCw size={16} />,
          iconBg: "bg-[#EFF6FF] text-[#0284C7] dark:bg-[#1E3A5F] dark:text-[#38BDF8]",
          iconColor: "text-[#0284C7] dark:text-[#38BDF8]",
          href: `/dashboard/tasks/${t._id}`,
        });
      }

      // Updated
      if (
        updatedTime &&
        createdTime &&
        Math.abs(updatedTime - createdTime) > 5000 &&
        statusNorm !== "COMPLETED" &&
        statusNorm !== "IN_PROGRESS"
      ) {
        items.push({
          id: `updated-${t._id}`,
          type: "task_updated",
          category: "TASKS",
          title: "Task Updated",
          description: `Modifications saved for "${t.title}"`,
          timestamp: new Date(updatedTime).toISOString(),
          badge: "Updated",
          badgeClass: "bg-[#FFFBEB] text-[#D97706] border-amber-300 dark:bg-[#451A03]/60 dark:text-[#FBBF24] dark:border-amber-700",
          icon: <CheckSquare size={16} />,
          iconBg: "bg-[#FFFBEB] text-[#D97706] dark:bg-[#451A03] dark:text-[#FBBF24]",
          iconColor: "text-[#D97706] dark:text-[#FBBF24]",
          href: `/dashboard/tasks/${t._id}`,
        });
      }

      // Created / Assigned
      if (createdTime) {
        items.push({
          id: `created-${t._id}`,
          type: "task_created",
          category: "TASKS",
          title: "Task Assigned",
          description: `New task assigned: "${t.title}"`,
          timestamp: new Date(createdTime).toISOString(),
          badge: t.priority ? t.priority.toUpperCase() : "Assigned",
          badgeClass: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE] dark:bg-[#1E3A5F]/60 dark:text-[#60A5FA] dark:border-[#1E435E]",
          icon: <ListTodo size={16} />,
          iconBg: "bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A5F] dark:text-[#60A5FA]",
          iconColor: "text-[#2563EB] dark:text-[#60A5FA]",
          href: `/dashboard/tasks/${t._id}`,
        });
      }
    });

    // Account & Security Events
    if (userProfile) {
      if (userProfile.isEmailVerified || userProfile.emailVerified) {
        const time = userProfile.updatedAt || userProfile.createdAt || nowTime;
        items.push({
          id: `email-verified-${userProfile._id || "me"}`,
          type: "email_verified",
          category: "SECURITY",
          title: "Email Verified",
          description: "Primary email address verified and secured",
          timestamp: new Date(time).toISOString(),
          badge: "Verified",
          badgeClass: "bg-[#ECFDF5] text-[#00875A] border-emerald-300 dark:bg-[#064E3B]/60 dark:text-[#34D399] dark:border-emerald-700",
          icon: <ShieldCheck size={16} />,
          iconBg: "bg-[#ECFDF5] text-[#00875A] dark:bg-[#064E3B] dark:text-[#34D399]",
          iconColor: "text-[#00875A] dark:text-[#34D399]",
          href: "/dashboard/profile",
        });
      }

      if (userProfile.createdAt) {
        items.push({
          id: `account-created-${userProfile._id || "me"}`,
          type: "account_created",
          category: "ACCOUNT",
          title: "Workspace Account Initialized",
          description: "Employee workspace account created and ready for assignments",
          timestamp: new Date(userProfile.createdAt).toISOString(),
          badge: "Account",
          badgeClass: "bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE] dark:bg-[#1E3A5F]/60 dark:text-[#60A5FA] dark:border-[#1E435E]",
          icon: <User size={16} />,
          iconBg: "bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A5F] dark:text-[#60A5FA]",
          iconColor: "text-[#2563EB] dark:text-[#60A5FA]",
          href: "/dashboard/profile",
        });
      }
    }

    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [tasksList, userProfile]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);

      const matchCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [activities, searchQuery, selectedCategory]);

  const taskCount = activities.filter((a) => a.category === "TASKS").length;
  const accountCount = activities.filter((a) => a.category === "ACCOUNT").length;
  const securityCount = activities.filter((a) => a.category === "SECURITY").length;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedActivities = filteredActivities.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  if (loading && !refreshing) {
    return <LoadingState message="Loading activity audit stream..." rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* =================================================
          1. PAGE HEADER
      ================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
              {language === "hi" ? "ऑडिट एवं टाइमलाइन" : "AUDIT & TIMELINE"}
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {t("recentActivity") || "Activity"}
          </h1>
          <p className="mt-1 text-[13px] text-[#64748B] dark:text-[#94A3B8]">
            {t("recentActivitySubtitle") || "Chronological audit trail of task milestones, account updates, and workspace events."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex h-[38px] items-center gap-2 rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] transition cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-[#2563EB]" : "text-[#64748B] dark:text-[#94A3B8]"}
            />
            <span>{refreshing ? "Refreshing..." : (t("common.refresh") || "Refresh")}</span>
          </button>
        </div>
      </div>

      {/* =================================================
          2. SUMMARY KPI TILES (4 TILES)
      ================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Events"
          value={activities.length}
          subtitle="All audit logs"
          icon={Activity}
          variant="primary"
          onClick={() => setSelectedCategory("ALL")}
          isActive={selectedCategory === "ALL"}
        />

        <StatCard
          title="Task Milestones"
          value={taskCount}
          subtitle="Assignments & status updates"
          icon={CheckSquare}
          variant="teal"
          onClick={() => setSelectedCategory("TASKS")}
          isActive={selectedCategory === "TASKS"}
        />

        <StatCard
          title="Account Events"
          value={accountCount}
          subtitle="Profile & credentials"
          icon={User}
          variant="amber"
          onClick={() => setSelectedCategory("ACCOUNT")}
          isActive={selectedCategory === "ACCOUNT"}
        />

        <StatCard
          title="Security Actions"
          value={securityCount}
          subtitle="Verifications & safeguards"
          icon={ShieldCheck}
          variant="emerald"
          onClick={() => setSelectedCategory("SECURITY")}
          isActive={selectedCategory === "SECURITY"}
        />
      </div>

      {/* =================================================
          3. SEGMENTED TABS & SEARCH TOOLBAR
      ================================================= */}
      <div className="rounded-[14px] border border-[#CBD5E1] bg-white p-3.5 sm:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* SEGMENTED CONTROL TABS */}
          <div className="inline-flex rounded-[8px] border border-[#CBD5E1] bg-[#F8FAFC] p-1 dark:border-[#1E3A47] dark:bg-[#071923] flex-wrap">
            {(
              [
                { key: "ALL", label: "All Activities", count: activities.length },
                { key: "TASKS", label: "Tasks", count: taskCount },
                { key: "ACCOUNT", label: "Account", count: accountCount },
                { key: "SECURITY", label: "Security", count: securityCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedCategory(tab.key)}
                className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === tab.key
                    ? "bg-[#2563EB] text-white shadow-xs dark:bg-[#1D4ED8]"
                    : "text-[#475569] hover:text-[#0F172A] hover:bg-white/60 dark:text-[#CBD5E1] dark:hover:text-white dark:hover:bg-[#102A36]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    selectedCategory === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-[#E2E8F0] text-[#475569] dark:bg-[#1E3A47] dark:text-[#CBD5E1]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* SEARCH INPUT */}
          <div className="relative w-full sm:w-72">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail..."
              className="h-[38px] w-full rounded-[8px] border border-[#CBD5E1] bg-[#FBFDFE] pl-9 pr-8 text-[13px] font-normal text-[#0F172A] placeholder-[#64748B] outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] dark:text-white dark:placeholder-[#94A3B8]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          4. TIMELINE LIST CONTAINER
      ================================================= */}
      <div className="rounded-[14px] border border-[#CBD5E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B] overflow-hidden">
        {paginatedActivities.length === 0 ? (
          <div className="py-16 text-center">
            <EmptyState
              icon={Activity}
              title={searchQuery ? "No Matching Activities" : "No Activity Recorded"}
              description={
                searchQuery
                  ? "No activity logs match your search keywords."
                  : "Activity events will be recorded here automatically."
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#18333F]">
            {paginatedActivities.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => router.push(item.href)}
                className="group flex items-start gap-4 p-4 sm:p-5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#102A36] cursor-pointer"
              >
                {/* ICON BOX */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#CBD5E1] dark:border-[#1E3A47] ${item.iconBg} ${item.iconColor}`}
                >
                  {item.icon}
                </div>

                {/* CONTENT */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-[14px] font-bold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                      {item.title}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${item.badgeClass}`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    <span>{formatFullDate(item.timestamp, language)}</span>
                    <span>•</span>
                    <span className="font-medium text-[#2563EB] dark:text-[#38BDF8]">
                      {formatRelativeTime(item.timestamp, language)}
                    </span>
                  </div>
                </div>

                {/* LINK ARROW */}
                <div className="shrink-0 pt-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] group-hover:border-[#2563EB] group-hover:text-[#2563EB] group-hover:bg-[#EFF6FF] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:group-hover:text-[#38BDF8] transition-colors">
                    <ArrowUpRight size={15} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PAGINATION */}
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={filteredActivities.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
