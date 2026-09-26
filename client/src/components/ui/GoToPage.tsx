"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

export interface GoToPageProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function GoToPage({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className = "",
}: GoToPageProps) {
  const { language } = useLanguage();
  const [pageInput, setPageInput] = useState("");

  // Edge case 1: If totalPages is 1 or less, direct navigation is unnecessary
  if (totalPages <= 1) return null;

  const handleGo = () => {
    if (disabled) return;
    const trimmed = pageInput.trim();
    if (!trimmed) return;

    const target = Number(trimmed);

    // Reject non-numeric input
    if (!Number.isInteger(target) || isNaN(target)) {
      showToast.error(
        language === "hi"
          ? "कृपया एक मान्य संख्यात्मक पृष्ठ संख्या दर्ज करें।"
          : "Please enter a valid numeric page number."
      );
      return;
    }

    // Reject page numbers less than 1 or greater than totalPages
    if (target < 1 || target > totalPages) {
      showToast.error(
        language === "hi"
          ? `पृष्ठ संख्या 1 और ${totalPages} के बीच होनी चाहिए।`
          : `Page number must be between 1 and ${totalPages}.`
      );
      return;
    }

    // Edge case 2: If user enters the current page, do not trigger an unnecessary API request
    if (target === currentPage) {
      setPageInput("");
      return;
    }

    // Valid page: trigger existing pagination logic directly
    onPageChange(target);
    setPageInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleGo();
    }
  };

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] ${className}`}
    >
      <span className="whitespace-nowrap font-medium text-[12px]">
        {language === "hi" ? "पृष्ठ पर जाएँ" : "Go to page"}
      </span>

      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={totalPages}
          disabled={disabled}
          value={pageInput}
          onChange={(e) => {
            const val = e.target.value;
            // Accept only digits
            if (/^\d*$/.test(val)) {
              setPageInput(val);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={String(currentPage)}
          aria-label={
            language === "hi"
              ? `पृष्ठ संख्या दर्ज करें (1 से ${totalPages})`
              : `Enter page number (1 to ${totalPages})`
          }
          className="h-[30px] w-12 rounded-[6px] border border-[#CBD5E1] bg-white px-1.5 text-center text-[12px] font-semibold text-[#0F172A] shadow-2xs outline-none transition focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#102A38] dark:text-white tabular-nums disabled:opacity-40"
        />

        <span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
          {language === "hi" ? `कुल ${totalPages}` : `of ${totalPages}`}
        </span>

        <button
          type="button"
          disabled={disabled || !pageInput.trim()}
          onClick={handleGo}
          aria-label={language === "hi" ? "पृष्ठ पर जाएँ" : "Go to page"}
          className="flex h-[30px] items-center justify-center rounded-[6px] bg-[#063B61] px-2.5 text-[12px] font-semibold text-white shadow-2xs transition hover:bg-[#084D7E] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#0879D9] dark:hover:bg-[#0A8CE8] cursor-pointer"
        >
          {language === "hi" ? "जाएँ" : "Go"}
        </button>
      </div>
    </div>
  );
}

export default GoToPage;
