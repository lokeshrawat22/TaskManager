"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
    const { t } = useLanguage();

  

  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {

    setLanguage(language === "en" ? "hi" : "en");
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="flex h-9 sm:h-10 shrink-0 items-center gap-1.5 sm:gap-2 rounded-xl border border-[#CBD5E1] bg-white px-2 sm:px-3 text-[12px] sm:text-[12.5px] font-medium text-[#475569] transition-all hover:bg-[#F8FAFC] focus:outline-none dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#B6C5CF] dark:hover:bg-[#102A36]"
      aria-label={t("switchLanguage") || "Switch Language"}
    >
      <Globe size={14} className="shrink-0 text-[#087D8F] dark:text-[#38BDF8]" />
      <span className="font-semibold text-[#087D8F] dark:text-[#38BDF8] uppercase sm:hidden">
        {language}
      </span>
      <span className={`hidden sm:inline ${language === "en" ? "font-semibold text-[#087D8F] dark:text-[#38BDF8]" : "opacity-60"}`}>
        {t("en") || "EN"}
      </span>
      <span className="hidden sm:inline opacity-40">|</span>
      <span className={`hidden sm:inline ${language === "hi" ? "font-semibold text-[#087D8F] dark:text-[#38BDF8]" : "opacity-60"}`}>
        हिन्दी
      </span>
    </button>
  );
}
