"use client";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  Flame,
  ListTodo,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  User,
  Zap,
  ArrowUpRight,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { getEmployeeDashboard } from "@/service/dashboard.service";
import { apiRequest } from "@/service/api.service";
import { useLanguage } from "@/context/LanguageContext";
import type { EmployeeDashboardData } from "@/types/dashboard";
import {
  StatCard,
  StatusBadge,
  PriorityBadge,
  SectionCard,
  SearchInput,
  EmptyState,
  ProgressBar,
} from "@/components/employee/SharedUI";

// =====================================================
// TYPES
// =====================================================

type UserProfile = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
  avatar?: string;
  profileImage?: string;
  image?: string;
  profilePhoto?: string | null;
};

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

type DashboardData = EmployeeDashboardData & {
  user?: UserProfile;
  upcomingDeadlines?: Task[];
  activeTasksList?: Task[];
  recentActivityList?: Task[];
};

// =====================================================
// HELPERS
// =====================================================

function getDisplayName(user?: UserProfile | null): string {
  if (!user) return "Team Member";
  if (user.fullName?.trim()) return user.fullName.trim();
  if (user.name?.trim()) return user.name.trim();

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Team Member";
}

function getLocalGreeting(language: string = "en"): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return language === "hi" ? "शुभ प्रभात" : "Good morning";
  }
  if (hour < 18) {
    return language === "hi" ? "शुभ दोपहर" : "Good afternoon";
  }
  return language === "hi" ? "शुभ संध्या" : "Good evening";
}

function isTaskDueToday(dueDate?: string | Date | null): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const isLocalSame =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const dUtcStr = d.toISOString().slice(0, 10);
  const nowUtcStr = now.toISOString().slice(0, 10);
  const nowLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return isLocalSame || dUtcStr === nowUtcStr || dUtcStr === nowLocalStr;
}

function isTaskOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  if (task.status === "COMPLETED") return false;
  if (isTaskDueToday(task.dueDate)) return false;

  const d = new Date(task.dueDate);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  return d.getTime() < now.getTime();
}

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
  const days = Math.floor(diffInSeconds / 86400);
  if (days === 1) {
    return language === "hi" ? "कल" : "Yesterday";
  }
  if (days < 30) {
    return language === "hi" ? `${days} दिन पहले` : `${days}d ago`;
  }

  return date.toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// =====================================================
// EMPLOYEE DASHBOARD PAGE COMPONENT
// =====================================================

export default function EmployeeDashboardPage() {
  const { t, language } = useLanguage();
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [allTasksList, setAllTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchActive, setSearchActive] = useState("");
  const [searchDeadlines, setSearchDeadlines] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [dashRes, myTasksRes] = await Promise.allSettled([
          getEmployeeDashboard(),
          apiRequest<any>("/api/tasks/my?limit=100", { method: "GET" }),
        ]);

        const dashData: EmployeeDashboardData | null =
          dashRes.status === "fulfilled" ? dashRes.value?.data || null : null;

        const myTasksData: Task[] =
          myTasksRes.status === "fulfilled"
            ? myTasksRes.value?.data?.tasks || []
            : [];

        const taskMap = new Map<string, Task>();
        myTasksData.forEach((task) => {
          if (task?._id) taskMap.set(String(task._id), task);
        });

        const backendTasks: Task[] = [
          ...(dashData?.todaysTasks || []),
          ...(dashData?.upcomingTasks || []),
        ];
        backendTasks.forEach((task) => {
          if (task?._id && !taskMap.has(String(task._id))) {
            taskMap.set(String(task._id), task);
          }
        });

        const mergedTasks = Array.from(taskMap.values());

        if (mounted) {
          setAllTasksList(mergedTasks);
        }

        const resolvedUpcomingDeadlines = mergedTasks
          .filter((t: Task) => {
            if (!t.dueDate) return false;
            const statusNorm = t.status?.toUpperCase() || "";
            if (statusNorm === "COMPLETED") return false;
            if (isTaskOverdue(t)) return false;
            return true;
          })
          .sort((a, b) => {
            const timeA = new Date(a.dueDate!).getTime();
            const timeB = new Date(b.dueDate!).getTime();
            return timeA - timeB;
          });

        const resolvedActiveTasks = mergedTasks
          .filter((t: Task) => {
            const statusNorm = t.status?.toUpperCase() || "";
            return (
              statusNorm === "IN_PROGRESS" ||
              statusNorm === "PENDING" ||
              statusNorm === "TODO"
            );
          })
          .sort((a, b) => {
            const isAProgress = a.status?.toUpperCase() === "IN_PROGRESS" ? 1 : 0;
            const isBProgress = b.status?.toUpperCase() === "IN_PROGRESS" ? 1 : 0;
            if (isAProgress !== isBProgress) return isBProgress - isAProgress;

            const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            return timeA - timeB;
          });

        const resolvedRecentActivity = [...mergedTasks].sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        const totalCount =
          mergedTasks.length > 0
            ? mergedTasks.length
            : dashData?.overview?.totalTasks || 0;
        const pendingCount =
          mergedTasks.length > 0
            ? mergedTasks.filter((t) => t.status === "PENDING" || t.status === "TODO").length
            : dashData?.overview?.pendingTasks || 0;
        const inProgressCount =
          mergedTasks.length > 0
            ? mergedTasks.filter((t) => t.status === "IN_PROGRESS").length
            : dashData?.overview?.inProgressTasks || 0;
        const completedCount =
          mergedTasks.length > 0
            ? mergedTasks.filter((t) => t.status === "COMPLETED").length
            : dashData?.overview?.completedTasks || 0;
        const overdueCount =
          mergedTasks.length > 0
            ? mergedTasks.filter((t) => isTaskOverdue(t)).length
            : dashData?.overview?.overdueTasks || 0;
        const completionRate =
          totalCount > 0
            ? Number(((completedCount / totalCount) * 100).toFixed(1))
            : 0;

        const finalDashboard: DashboardData = {
          user: dashData?.user,
          overview: {
            totalTasks: totalCount,
            pendingTasks: pendingCount,
            inProgressTasks: inProgressCount,
            completedTasks: completedCount,
            overdueTasks: overdueCount,
            completionRate: isNaN(completionRate) ? 0 : completionRate,
          },
          taskDistribution: {
            TODO: pendingCount,
            IN_PROGRESS: inProgressCount,
            COMPLETED: completedCount,
          },
          todaysTasks: resolvedUpcomingDeadlines,
          upcomingTasks: resolvedUpcomingDeadlines,
          upcomingDeadlines: resolvedUpcomingDeadlines,
          activeTasksList: resolvedActiveTasks,
          recentActivityList: resolvedRecentActivity,
        };

        if (mounted) {
          setDashboard(finalDashboard);
        }
      } catch (err: any) {
        console.error("Dashboard error:", err);
        if (mounted) {
          setError(
            t("unableToLoadDashboard") || "Unable to load dashboard data."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [t]);

  const filteredDeadlines = useMemo(() => {
    const list = dashboard?.upcomingDeadlines || [];
    const q = searchDeadlines.trim().toLowerCase();
    if (!q) return list;
    return list.filter((task: Task) =>
      `${task.title || ""} ${task.description || ""} ${task.priority || ""} ${task.status || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [dashboard?.upcomingDeadlines, searchDeadlines]);

  const filteredActiveTasks = useMemo(() => {
    const list = dashboard?.activeTasksList || [];
    const q = searchActive.trim().toLowerCase();
    if (!q) return list;
    return list.filter((task: Task) =>
      `${task.title || ""} ${task.description || ""} ${task.priority || ""} ${task.status || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [dashboard?.activeTasksList, searchActive]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-[14px] bg-white dark:bg-[#0B202B] border border-[#CBD5E1] dark:border-[#1E3A47]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[114px] rounded-[12px] bg-white dark:bg-[#0B202B] border border-[#CBD5E1] dark:border-[#1E3A47]"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 rounded-[14px] bg-white dark:bg-[#0B202B] border border-[#CBD5E1] dark:border-[#1E3A47]" />
          <div className="h-96 rounded-[14px] bg-white dark:bg-[#0B202B] border border-[#CBD5E1] dark:border-[#1E3A47]" />
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="w-full max-w-md rounded-[14px] border border-[#CBD5E1] bg-white p-8 text-center shadow-xs dark:border-[#1E3A47] dark:bg-[#0B202B]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626] dark:bg-[#3A1418] dark:text-[#F87171]">
            <AlertCircle size={24} />
          </div>
          <h2 className="mt-4 text-base font-bold text-[#0F172A] dark:text-white">
            Failed to Load Workspace
          </h2>
          <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
            {error || "An unexpected error occurred while fetching your dashboard data."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#063B61] hover:bg-[#042741] px-4 py-2 text-xs font-semibold text-white shadow-xs transition cursor-pointer dark:bg-[#0879D9] dark:hover:bg-[#0665B5]"
          >
            <RefreshCw size={14} />
            <span>{t("common.retry") || "Retry"}</span>
          </button>
        </div>
      </div>
    );
  }

  const { user, overview, taskDistribution } = dashboard;
  const displayName = getDisplayName(user);
  const greeting = getLocalGreeting(language);
  const formattedToday = new Date().toLocaleDateString(
    language === "hi" ? "hi-IN" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <div className="space-y-6">
      {/* =================================================
          1. WELCOME HERO CARD (PREMIUM ENTERPRISE WHITE)
      ================================================= */}
      <section className="rounded-[14px] border border-[#CBD5E1] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
                {t("employeeWorkspace") || "EMPLOYEE WORKSPACE"}
              </span>
            </div>

            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#0F172A] dark:text-white leading-tight">
              {greeting},{" "}
              <span className="text-[#1D4ED8] dark:text-[#38BDF8]">{displayName}</span> 👋
            </h1>

            <p className="mt-1.5 text-[13px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
              {t("todayIs") || "Today is"} <span className="font-semibold text-[#0F172A] dark:text-white">{formattedToday}</span>. Track your assignments, monitor deadlines, and complete tasks on schedule.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2.5 dark:border-[#1E3A47] dark:bg-[#102A36]">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#CBD5E1]">
                {t("completion") || "Completion Rate"}
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#00A878] dark:text-[#34D399] tabular-nums">
                {overview.completionRate}%
              </p>
            </div>

            <div className="rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2.5 dark:border-[#1E3A47] dark:bg-[#102A36]">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#CBD5E1]">
                {t("tasksDone") || "Tasks Done"}
              </p>
              <p className="mt-0.5 text-xl font-bold text-[#0F172A] dark:text-white tabular-nums">
                {overview.completedTasks} / {overview.totalTasks}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================
          2. KPI CARDS STRIP (EXACT 5-CARD GRID)
      ================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title={t("tasks.totalTasks") || "TOTAL TASKS"}
          value={overview.totalTasks}
          subtitle={language === "hi" ? "असाइन किया गया" : "Assigned work"}
          icon={ClipboardList}
          variant="primary"
          onClick={() => router.push("/dashboard/tasks")}
        />

        <StatCard
          title={t("status.pending") || "PENDING"}
          value={overview.pendingTasks}
          subtitle={language === "hi" ? "शुरू नहीं हुआ" : "Not started"}
          icon={Clock3}
          variant="amber"
          onClick={() => router.push("/dashboard/tasks?status=PENDING")}
        />

        <StatCard
          title={t("status.in_progress") || "IN PROGRESS"}
          value={overview.inProgressTasks}
          subtitle={language === "hi" ? "सक्रिय कार्य" : "Active work"}
          icon={Clock3}
          variant="teal"
          onClick={() => router.push("/dashboard/tasks?status=IN_PROGRESS")}
        />

        <StatCard
          title={t("status.completed") || "COMPLETED"}
          value={overview.completedTasks}
          subtitle={language === "hi" ? "पूर्ण" : "Done"}
          icon={CheckCircle2}
          variant="emerald"
          onClick={() => router.push("/dashboard/tasks?status=COMPLETED")}
        />

        <StatCard
          title={t("dashboard.overdue") || "OVERDUE"}
          value={overview.overdueTasks}
          subtitle={overview.overdueTasks > 0 ? (language === "hi" ? "कार्रवाई आवश्यक" : "Action required") : (language === "hi" ? "समय पर" : "All on track")}
          icon={AlertTriangle}
          variant="rose"
          onClick={() => router.push("/dashboard/tasks?status=OVERDUE")}
        />
      </section>

      {/* =================================================
          3. MAIN TWO-COLUMN WORKSPACE GRID
      ================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* =================================================
            LEFT COLUMN (2 COLS): ACTIVE TASKS & RECENT TIMELINE
        ================================================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Tasks Panel */}
          <SectionCard
            title={t("activeTasks") || "Active Tasks"}
            subtitle="Tasks currently in progress or awaiting your execution"
            icon={CheckSquare}
            headerAction={
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] transition-colors"
              >
                <span>{t("common.viewAll") || "View All"}</span>
                <ChevronRight size={14} />
              </Link>
            }
          >
            {/* Search Filter */}
            <div className="mb-4">
              <SearchInput
                value={searchActive}
                onChange={setSearchActive}
                placeholder="Filter active tasks by title, priority..."
              />
            </div>

            {/* List */}
            {filteredActiveTasks.length > 0 ? (
              <div className="space-y-2.5">
                {filteredActiveTasks.slice(0, 5).map((task) => (
                  <div
                    key={task._id}
                    onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                    className="group flex items-center justify-between gap-3 rounded-[10px] border border-[#CBD5E1] bg-white p-3.5 transition-colors duration-150 hover:border-[#2563EB] hover:bg-[#F8FAFC] shadow-2xs cursor-pointer dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8] dark:hover:bg-[#102A36]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                          {task.title}
                        </p>
                        <PriorityBadge priority={task.priority} />
                        <StatusBadge status={task.status || "PENDING"} size="sm" />
                      </div>

                      {task.description && (
                        <p className="mt-1 line-clamp-1 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                          {task.description}
                        </p>
                      )}

                      {task.dueDate && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                          <CalendarDays size={13} className="text-[#2563EB] dark:text-[#38BDF8]" />
                          <span>
                            Due: {new Date(task.dueDate).toLocaleDateString(language === "hi" ? "hi-IN" : "en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#64748B] group-hover:border-[#2563EB] group-hover:text-[#2563EB] group-hover:bg-[#EFF6FF] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:group-hover:text-[#38BDF8] transition-colors">
                      <ChevronRight size={16} />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="No Active Tasks"
                description={
                  searchActive
                    ? "No active tasks match your search filter."
                    : "You do not have any tasks currently pending or in progress."
                }
              />
            )}
          </SectionCard>

          {/* Recent Activity Timeline Panel */}
          <SectionCard
            title={t("recentActivity") || "Recent Activity"}
            subtitle="Recent updates to your assignments and deliverables"
            icon={Activity}
            headerAction={
              <Link
                href="/dashboard/activity"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] transition-colors"
              >
                <span>{t("common.viewAll") || "View Activity Log"}</span>
                <ChevronRight size={14} />
              </Link>
            }
          >
            {dashboard.recentActivityList && dashboard.recentActivityList.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentActivityList.slice(0, 5).map((task, idx) => (
                  <div
                    key={task._id || idx}
                    onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                    className="flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#102A36] cursor-pointer"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#102A36] dark:text-[#38BDF8] border border-[#CBD5E1] dark:border-[#1E3A47]">
                      <ClipboardList size={15} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white">
                        {task.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        <StatusBadge status={task.status} size="sm" />
                        <span>•</span>
                        <span>{formatRelativeTime(task.updatedAt || task.createdAt, language)}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-[#2563EB] dark:text-[#38BDF8] shrink-0">
                      View
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No Recent Activity"
                description="Activity updates will appear here once tasks are modified."
              />
            )}
          </SectionCard>
        </div>

        {/* =================================================
            RIGHT COLUMN (1 COL): UPCOMING DEADLINES & WORKLOAD
        ================================================= */}
        <div className="space-y-6">
          {/* Upcoming Deadlines Panel */}
          <SectionCard
            title={t("upcomingDeadlines") || "Upcoming Deadlines"}
            subtitle="Scheduled deliverables requiring your attention"
            icon={CalendarDays}
            headerAction={
              <Link
                href="/dashboard/calendar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] transition-colors"
              >
                <span>{t("common.calendar") || "Calendar"}</span>
                <ChevronRight size={14} />
              </Link>
            }
          >
            {filteredDeadlines.length > 0 ? (
              <div className="space-y-2.5">
                {filteredDeadlines.slice(0, 4).map((task) => {
                  const isToday = isTaskDueToday(task.dueDate);

                  return (
                    <div
                      key={task._id}
                      onClick={() => router.push(`/dashboard/tasks/${task._id}`)}
                      className="rounded-[10px] border border-[#CBD5E1] bg-white p-3 transition-colors hover:border-[#2563EB] hover:bg-[#F8FAFC] cursor-pointer dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:border-[#38BDF8] dark:hover:bg-[#102A36]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold text-[#0F172A] dark:text-white">
                          {task.title}
                        </p>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8]">
                          <Clock3 size={13} className={isToday ? "text-[#D97706]" : "text-[#2563EB]"} />
                          <span className={isToday ? "font-semibold text-[#D97706]" : ""}>
                            {isToday ? "Due Today" : new Date(task.dueDate!).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                        </div>

                        <StatusBadge status={task.status || "PENDING"} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No Upcoming Deadlines"
                description="You are caught up with all upcoming assignments."
              />
            )}
          </SectionCard>

          {/* Task Distribution / Analytics Card */}
          <SectionCard
            title={t("taskDistribution") || "Task Distribution"}
            subtitle="Personal workload breakdown by status"
            icon={BarChart3}
            headerAction={
              <Link
                href="/dashboard/reports"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] dark:text-[#38BDF8] transition-colors"
              >
                <span>{t("common.reports") || "Reports"}</span>
                <ChevronRight size={14} />
              </Link>
            }
          >
            <div className="space-y-4">
              <ProgressBar
                label="Completed"
                percentage={overview.totalTasks > 0 ? (overview.completedTasks / overview.totalTasks) * 100 : 0}
                color="emerald"
              />

              <ProgressBar
                label="In Progress"
                percentage={overview.totalTasks > 0 ? (overview.inProgressTasks / overview.totalTasks) * 100 : 0}
                color="blue"
              />

              <ProgressBar
                label="Pending"
                percentage={overview.totalTasks > 0 ? (overview.pendingTasks / overview.totalTasks) * 100 : 0}
                color="amber"
              />

              <div className="border-t border-[#E2E8F0] pt-3 text-[11px] text-[#64748B] dark:border-[#1E3A47] dark:text-[#94A3B8] flex justify-between">
                <span>Total Assigned Tasks</span>
                <span className="font-bold text-[#0F172A] dark:text-white">{overview.totalTasks}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}