"use client";

import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  FileCheck,
  FilePlus2,
  History,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/service/api.service";
import { can, PERMISSIONS } from "@/constants/rbac";
import { RecentTaskItem } from "../types";

interface RecentActivityProps {
  tasks: RecentTaskItem[];
  role?: string;
}

interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  relativeTime: string;
  icon: any;
  iconColor: string;
}

function getRelativeTime(dateStr: string | undefined, t: (k: string, ...args: any[]) => string, language: string): string {
  if (!dateStr) return language === "hi" ? "हाल ही में" : "Recently";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return language === "hi" ? "हाल ही में" : "Recently";

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return t("common.justNow") || (language === "hi" ? "अभी" : "Just now");
  if (diffSec < 3600) return t("common.minAgo", { count: Math.floor(diffSec / 60) }) || (language === "hi" ? `${Math.floor(diffSec / 60)} मिनट पहले` : `${Math.floor(diffSec / 60)}m ago`);
  if (diffSec < 86400) return t("common.hoursAgo", { count: Math.floor(diffSec / 3600) }) || (language === "hi" ? `${Math.floor(diffSec / 3600)} घंटे पहले` : `${Math.floor(diffSec / 3600)}h ago`);
  if (diffSec < 172800) return t("common.yesterday") || (language === "hi" ? "कल" : "Yesterday");
  return t("common.daysAgo", { count: Math.floor(diffSec / 86400) }) || (language === "hi" ? `${Math.floor(diffSec / 86400)} दिन पहले` : `${Math.floor(diffSec / 86400)}d ago`);
}

export default function RecentActivity({ tasks, role }: RecentActivityProps) {
  const { t, language } = useLanguage();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetchedRef = useRef(false);

  // Guard: If role explicitly does not have permission, prevent mount/API call
  if (role && !can(role, PERMISSIONS.AUDIT_LOGS_VIEW)) {
    return null;
  }

  useEffect(() => {
    // Double check permission before making network request
    if (!role || !can(role, PERMISSIONS.AUDIT_LOGS_VIEW)) {
      return;
    }

    if (hasFetchedRef.current) {
      return;
    }

    const controller = new AbortController();
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const res = await apiRequest<any>("/api/admin/audit-logs?limit=8", {
          method: "GET",
          signal: controller.signal,
        });
        const logs = res?.data?.logs || res?.logs || res?.data || [];
        if (!controller.signal.aborted && Array.isArray(logs) && logs.length > 0) {
          hasFetchedRef.current = true;
          setAuditLogs(logs);
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        // Fallback to deriving activity from real task events
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAudit();
    return () => {
      controller.abort();
    };
  }, [role]);

  // Compute unified dynamic activity events from real audit logs + real task events
  const activityList: ActivityEvent[] = useMemo(() => {
    if (auditLogs.length > 0) {
      return auditLogs.slice(0, 6).map((log, idx) => {
        const actor = log.userName || log.userEmail?.split("@")[0] || "Administrator";
        const action = log.action || log.eventType?.toLowerCase() || "updated";
        const target = log.resource || log.endpoint || "system record";
        const time = log.createdAt || new Date().toISOString();

        let icon = History;
        let iconColor = "bg-[#EFF6FF] text-[#2563EB]";

        if (action.includes("create") || action.includes("add")) {
          icon = FilePlus2;
          iconColor = "bg-[#EFF6FF] text-[#2563EB]";
        } else if (action.includes("complete") || action.includes("success")) {
          icon = CheckCircle2;
          iconColor = "bg-[#F0FDF4] text-[#16A34A]";
        } else if (action.includes("user") || action.includes("employee")) {
          icon = UserCheck;
          iconColor = "bg-[#ECFEFF] text-[#0891B2]";
        } else if (action.includes("role") || action.includes("auth")) {
          icon = ShieldAlert;
          iconColor = "bg-[#FFFBEB] text-[#D97706]";
        }

        return {
          id: log._id || String(idx),
          actor,
          action,
          target,
          timestamp: time,
          relativeTime: getRelativeTime(time, t, language),
          icon,
          iconColor,
        };
      });
    }

    // Fallback: Real tasks activity events
    return tasks.slice(0, 6).map((task, idx) => {
      const isCompleted = String(task.status || "").toUpperCase() === "COMPLETED";
      const assignedName =
        typeof task.assignedTo === "object" && task.assignedTo !== null
          ? `${(task.assignedTo as any).firstName || ""} ${(task.assignedTo as any).lastName || ""}`.trim() ||
            (task.assignedTo as any).email?.split("@")[0]
          : t("common.employee") || "Workforce member";

      const actor = assignedName || "System";
      const action = isCompleted
        ? (language === "hi" ? "पूर्ण किया" : "completed")
        : (language === "hi" ? "पर काम कर रहे हैं" : "is working on");
      const target = task.title;
      const time = task.createdAt || new Date().toISOString();

      const icon = isCompleted ? CheckCircle2 : FileTextIcon;
      const iconColor = isCompleted
        ? "bg-[#F0FDF4] text-[#16A34A]"
        : "bg-[#EFF6FF] text-[#2563EB]";

      return {
        id: task._id || task.id || String(idx),
        actor,
        action,
        target,
        timestamp: time,
        relativeTime: getRelativeTime(time, t, language),
        icon,
        iconColor,
      };
    });
  }, [auditLogs, tasks, t, language]);

  function FileTextIcon(props: any) {
    return <FileCheck {...props} />;
  }

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-7 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
              {language === "hi" ? "सिस्टम टाइमलाइन" : "SYSTEM TIMELINE"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.recentActivity") || "Recent activity"}
            </h3>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi"
                ? "वास्तविक समय के प्रशासनिक संचालन और कार्यबल वितरण।"
                : "Real-time administrative operations and workforce deliverables."}
            </p>
          </div>

          <Link
            href="/admin/audit-logs"
            className="inline-flex items-center gap-1 text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] shrink-0 transition-colors"
          >
            {language === "hi" ? "सभी गतिविधियाँ देखें" : "View all activity"} <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Activity Items List */}
        {activityList.length === 0 ? (
          <div className="my-12 flex flex-col items-center justify-center text-center">
            <p className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
              {language === "hi" ? "कोई हालिया गतिविधि दर्ज नहीं की गई" : "No recent activity recorded"}
            </p>
            <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8] mt-1">
              {language === "hi"
                ? "जैसे ही टीम के सदस्य कार्यों को पूर्ण और अद्यतन करेंगे, यहाँ घटनाएँ प्रदर्शित होंगी।"
                : "Events will appear here as team members complete and update deliverables."}
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#F1F5F9] dark:divide-[#163854]">
            {activityList.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#12364E] rounded-lg px-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] dark:bg-slate-800 dark:text-slate-300"
                    >
                      <IconComp size={14} />
                    </div>
                    <div className="min-w-0 flex-1 text-[13px] leading-[18px]">
                      <p className="text-[#334155] dark:text-[#E2E8F0] truncate">
                        <strong className="font-semibold text-[#0F172A] dark:text-white">{item.actor}</strong>{" "}
                        <span className="font-normal text-[#64748B] dark:text-[#94A3B8]">{item.action}</span>{" "}
                        <span className="font-medium text-[#0F172A] dark:text-[#38BDF8]">
                          &ldquo;{item.target}&rdquo;
                        </span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8] shrink-0 tabular-nums">
                    {item.relativeTime}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#CBD5E1] dark:border-[#1E435E] flex items-center justify-between text-xs">
        <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
          {language === "hi" ? "सुरक्षा ऑडिट ट्रैकिंग सक्षम है" : "Security audit tracking enabled"}
        </span>
        <Link
          href="/admin/audit-logs"
          className="text-[13px] font-semibold leading-[18px] text-[#1D4ED8] hover:text-[#1E40AF] dark:text-[#38BDF8] transition-colors"
        >
          {language === "hi" ? "ऑडिट लॉग देखें →" : "View audit logs →"}
        </Link>
      </div>
    </div>
  );
}
