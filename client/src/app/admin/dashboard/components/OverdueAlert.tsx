"use client";

import { ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";

interface OverdueAlertProps {
  overdueCount: number;
}

export default function OverdueAlert({ overdueCount }: OverdueAlertProps) {
  const router = useRouter();
  const { t, language } = useLanguage();

  if (overdueCount > 0) {
    return (
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#FEF2F2] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#4C121A] dark:text-[#F87171]">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#E5484D] border border-[#FEE2E2] dark:bg-[#4C121A] dark:text-[#FCA5A5] mb-1">
              {t("dashboard.actionRequired") || "ATTENTION REQUIRED"}
            </div>
            <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-[#FCA5A5]">
              {language === "hi"
                ? `${overdueCount} अतिदेय कार्यों पर ध्यान देने की आवश्यकता है`
                : `${overdueCount} overdue ${overdueCount === 1 ? "task needs" : "tasks need"} attention`}
            </h4>
            <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#F87171] mt-0.5">
              {language === "hi"
                ? "अतिदेय कार्यों की समीक्षा करें और जिम्मेदार कर्मचारियों से संपर्क करें।"
                : "Review overdue work and follow up with responsible employees."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/admin/tasks?status=OVERDUE")}
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[#E5484D] hover:bg-[#D13C41] px-4 py-2 text-[13px] font-semibold leading-[18px] text-white transition-colors cursor-pointer shadow-2xs"
        >
          {language === "hi" ? "कार्यों की समीक्षा करें" : "Review Tasks"} <ArrowUpRight size={14} />
        </button>
      </section>
    );
  }

  // ALL CLEAR POSITIVE STATE
  return (
    <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[14px] border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
      <div className="flex items-center gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#ECFDF5] text-[#00A878] border border-[#A7F3D0] dark:bg-[#064E3B]/60 dark:text-[#34D399]">
          <CheckCircle2 size={18} />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#00A878] border border-[#A7F3D0] dark:bg-[#065F46]/50 dark:text-[#A7F3D0] mb-1">
            {language === "hi" ? "सब ठीक है" : "ALL CLEAR"}
          </div>
          <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-[#34D399]">
            {language === "hi" ? "किसी भी अतिदेय कार्य पर ध्यान देने की आवश्यकता नहीं है" : "No overdue tasks require attention"}
          </h4>
          <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#A7F3D0]/80 mt-0.5">
            {t("dashboard.allDeliverablesOnSchedule") || "All organizational deliverables are progressing on schedule without critical delays."}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/admin/tasks")}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-[9px] border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] px-4 py-2 text-[13px] font-semibold leading-[18px] text-[#0F172A] transition-colors cursor-pointer dark:border-[#1E435E] dark:bg-[#0B2538] dark:text-white"
      >
        {t("dashboard.viewAllTasks") || "View all tasks"} <ArrowUpRight size={14} />
      </button>
    </section>
  );
}
