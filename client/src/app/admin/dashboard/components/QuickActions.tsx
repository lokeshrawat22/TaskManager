"use client";

import {
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardList,
  History,
  Plus,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/service/api.service";
import { WorkspaceHealthData } from "../types";

export default function QuickActions() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<WorkspaceHealthData>({
    status: "UP",
    database: "connected",
  });
  const hasCheckedHealthRef = useRef(false);

  // Check live system health
  useEffect(() => {
    if (hasCheckedHealthRef.current) return;

    const controller = new AbortController();
    const checkHealth = async () => {
      try {
        const res = await apiRequest<WorkspaceHealthData>("/health", {
          method: "GET",
          signal: controller.signal,
        });
        if (!controller.signal.aborted && res) {
          hasCheckedHealthRef.current = true;
          setHealth({
            status: res.status === "UP" ? "UP" : "DEGRADED",
            database: res.database || "connected",
          });
        }
      } catch (err: any) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setHealth({ status: "UP", database: "connected" });
      }
    };

    checkHealth();
    return () => {
      controller.abort();
    };
  }, []);

  const isHealthy = health.status === "UP";

  const actions = [
    {
      title: t("tasks.createNewTask") || (language === "hi" ? "कार्य बनाएँ" : "Create Task"),
      desc: language === "hi" ? "किसी कर्मचारी या टीम को कार्य सौंपें" : "Assign work to an employee or team",
      icon: Plus,
      href: "/admin/tasks/create",
      iconStyle: "bg-[#00A6C7]/10 text-[#00A6C7] border-[#00A6C7]/20",
    },
    {
      title: language === "hi" ? "कर्मचारियों का प्रबंधन करें" : "Manage Employees",
      desc: language === "hi" ? "निर्देशिका, भूमिकाएँ और असाइनमेंट" : "Directory, roles, and assignments",
      icon: Users,
      href: "/admin/employees",
      iconStyle: "bg-[#00A878]/10 text-[#00A878] border-[#00A878]/20",
    },
    {
      title: language === "hi" ? "विभाग प्रबंधित करें" : "Manage Departments",
      desc: language === "hi" ? "संगठनात्मक इकाइयाँ बनाएँ और कॉन्फ़िगर करें" : "Create and configure organization units",
      icon: Building2,
      href: "/admin/departments",
      iconStyle: "bg-[#063B61]/10 text-[#063B61] dark:bg-white/10 dark:text-[#38BDF8] border-[#063B61]/20",
    },
    {
      title: language === "hi" ? "रिपोर्ट देखें" : "View Reports",
      desc: language === "hi" ? "संगठन वितरण मेट्रिक्स का विश्लेषण करें" : "Analyze organization delivery metrics",
      icon: BarChart3,
      href: "/admin/reports",
      iconStyle: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20",
    },
    {
      title: t("common.rolesAndPermissions") || (language === "hi" ? "भूमिकाएँ और अनुमतियाँ" : "Roles & Permissions"),
      desc: language === "hi" ? "पहुँच नियंत्रण, विशेषाधिकार और सुरक्षा" : "Access control, privileges and security",
      icon: Shield,
      href: "/admin/roles",
      iconStyle: "bg-[#F2A51A]/10 text-[#D97706] border-[#F2A51A]/20",
    },
    {
      title: t("common.auditLogs") || (language === "hi" ? "ऑडिट लॉग" : "Audit Logs"),
      desc: language === "hi" ? "सुरक्षा घटनाएँ और परिचालन इतिहास" : "Security events and operational history",
      icon: History,
      href: "/admin/audit-logs",
      iconStyle: "bg-[#E5484D]/10 text-[#E5484D] border-[#E5484D]/20",
    },
  ];

  return (
    <div className="rounded-[14px] border border-[#E2E8F0] bg-white p-5 sm:p-6 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538] lg:col-span-5 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
              {language === "hi" ? "परिचालन शॉर्टकट" : "OPERATIONAL SHORTCUTS"}
            </p>
            <h3 className="mt-1 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
              {t("dashboard.quickActions") || "Quick actions"}
            </h3>
            <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
              {language === "hi" ? "अक्सर उपयोग किए जाने वाले प्रशासनिक नियंत्रण।" : "Frequently used administrative controls."}
            </p>
          </div>
        </div>

        {/* 6 Compact Action Rows */}
        <div className="mt-4 space-y-2">
          {actions.map((act) => {
            const IconComponent = act.icon;
            return (
              <button
                key={act.title}
                type="button"
                onClick={() => router.push(act.href)}
                className="group flex h-[50px] w-full items-center gap-3 rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-left transition-all hover:border-[#1D4ED8]/60 hover:bg-[#F8FAFC] dark:border-[#1A3D54] dark:bg-[#0B2538] dark:hover:bg-[#12364E] cursor-pointer"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border ${act.iconStyle}`}
                >
                  <IconComponent size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[#0F172A] group-hover:text-[#1D4ED8] dark:text-white dark:group-hover:text-[#38BDF8] transition-colors leading-[18px]">
                    {act.title}
                  </p>
                  <p className="truncate text-[12px] font-normal text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-[17px]">
                    {act.desc}
                  </p>
                </div>
                <ChevronRight
                  size={15}
                  className="text-[#64748B] transition-all group-hover:text-[#1D4ED8] group-hover:translate-x-0.5"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-4 pt-3.5 border-t border-[#CBD5E1] dark:border-[#1E435E] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isHealthy
                ? "bg-[#00A878]"
                : "bg-[#F2A51A]"
            }`}
          />
          <span className="text-[12px] font-medium leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
            {isHealthy
              ? (language === "hi" ? "सभी प्रशासनिक प्रणालियाँ चालू हैं" : "All administrative systems operational")
              : (language === "hi" ? "डेटाबेस ख़राब है" : "Database degraded")}
          </span>
        </div>
        <ShieldCheck size={15} className="text-[#00A878]" />
      </div>
    </div>
  );
}
