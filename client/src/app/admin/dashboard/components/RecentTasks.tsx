"use client";

import { ArrowUpRight, Briefcase, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { RecentTaskItem } from "../types";

interface RecentTasksProps {
  tasks: RecentTaskItem[];
}

export default function RecentTasks({ tasks }: RecentTasksProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-none dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-7 xl:col-span-8 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#718E9A]">
              {language === "hi" ? "नवीनतम गतिविधि" : "LATEST ACTIVITY"}
            </p>
            <h3 className="mt-0.5 text-[18px] sm:text-[19px] font-semibold text-[#0F172A] dark:text-[#E5F1F5] tracking-tight">
              {t("dashboard.recentTasks") || "Recent tasks"}
            </h3>
            <p className="text-[12.5px] font-normal text-[#64748B] dark:text-[#8CB0C7]">
              {language === "hi"
                ? "आपके संगठन में नवीनतम परिचालन कार्य अपडेट।"
                : "Latest operational task updates across your organization."}
            </p>
          </div>

          <Link
            href="/admin/tasks"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#2563EB] hover:underline dark:text-[#38BDF8]"
          >
            {t("dashboard.viewAllTasks") || "View all tasks"} <ArrowUpRight size={13} />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <div className="my-16 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
              {language === "hi" ? "कोई हालिया कार्य गतिविधि नहीं" : "No recent task activity"}
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#718E9A] mt-1">
              {language === "hi" ? "सिस्टम में अभी तक कोई कार्य पंजीकृत नहीं किया गया है।" : "No tasks have been registered in the system yet."}
            </p>
          </div>
        ) : (
          /* Spacious Task List with comfortable rows & full metadata */
          <div className="mt-5 divide-y divide-[#F1F5F9] dark:divide-[#163854]">
            {tasks.map((task, idx) => {
              const taskId = task._id || task.id || String(idx);
              const status = String(task.status || "PENDING").toUpperCase();
              const priority = String(task.priority || "MEDIUM").toUpperCase();

              // Status Badge Styling
              let statusBadge = {
                text: t("status.pending") || "Pending",
                bg: "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]",
              };

              if (status === "COMPLETED") {
                statusBadge = {
                  text: t("status.completed") || "Completed",
                  bg: "bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]",
                };
              } else if (status === "IN_PROGRESS") {
                statusBadge = {
                  text: t("status.in_progress") || "In Progress",
                  bg: "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]",
                };
              }

              // Priority Badge Styling
              let priorityBadge = {
                text: t("priority.medium") || "Medium",
                bg: "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]",
              };

              if (priority === "HIGH" || priority === "URGENT") {
                priorityBadge = {
                  text: priority === "URGENT" ? (t("priority.urgent") || "Urgent") : (t("priority.high") || "High"),
                  bg: "bg-[#FEF2F2] text-[#DC2626] border border-[#FEE2E2]",
                };
              } else if (priority === "LOW") {
                priorityBadge = {
                  text: t("priority.low") || "Low",
                  bg: "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]",
                };
              }

              const dateFormatted = task.dueDate
                ? new Date(task.dueDate).toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : (language === "hi" ? "कोई नियत तिथि नहीं" : "No due date");

              return (
                <div
                  key={taskId}
                  onClick={() => router.push(`/admin/tasks/${taskId}`)}
                  className="group flex min-h-[58px] cursor-pointer items-center justify-between gap-4 py-2.5 transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#12364E] rounded-xl px-2"
                >
                  {/* Left: Icon + Title & Description */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B] transition-transform group-hover:scale-105 dark:bg-[#172D49] dark:text-[#60A5FA]">
                      <Briefcase size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors">
                        {task.title}
                      </p>
                      <p className="truncate text-[12px] text-[#64748B] dark:text-[#718E9A]">
                        {task.description || "Operational workflow task item."}
                      </p>
                    </div>
                  </div>

                  {/* Right: Badges & Due Date */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusBadge.bg}`}
                    >
                      {statusBadge.text}
                    </span>

                    <span
                      className={`hidden sm:inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${priorityBadge.bg}`}
                    >
                      {priorityBadge.text}
                    </span>

                    <span className="text-[12px] font-normal text-[#94A3B8] dark:text-[#718E9A] tabular-nums min-w-[70px] text-right">
                      {dateFormatted}
                    </span>

                    <ChevronRight
                      size={14}
                      className="text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
