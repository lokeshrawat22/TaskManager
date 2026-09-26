"use client";

import React from "react";
import {
  Eye,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  Sparkles,
  ZapOff,
  Type,
  Maximize2,
  Check,
  CheckCircle2,
} from "lucide-react";
import {
  useAccessibility,
  FontSize,
  DisplayScale,
} from "@/context/AccessibilityContext";
import { useTheme } from "@/components/ThemeProvider";
import { useLanguage } from "@/context/LanguageContext";
import { showToast } from "@/lib/toast";

export default function AccessibilitySettingsCard() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const {
    settings,
    setFontSize,
    setDisplayScale,
    setHighContrast,
    setReduceMotion,
    resetToDefaults,
  } = useAccessibility();

  const fontOptions: { id: FontSize; label: string; sub: string; sample: string }[] = [
    { id: "small", label: "Small", sub: "14px", sample: "A-" },
    { id: "default", label: "Default", sub: "16px", sample: "A" },
    { id: "large", label: "Large", sub: "18px", sample: "A+" },
    { id: "extra-large", label: "Extra Large", sub: "20px", sample: "A++" },
  ];

  const scaleOptions: { id: DisplayScale; label: string; sub: string }[] = [
    { id: "90", label: "90%", sub: "Compact" },
    { id: "100", label: "100%", sub: "Default" },
    { id: "110", label: "110%", sub: "Comfortable" },
    { id: "125", label: "125%", sub: "Expanded" },
  ];

  const handleFontChange = (size: FontSize) => {
    setFontSize(size);
    showToast.success(`Font size updated to ${size}`);
  };

  const handleScaleChange = (scale: DisplayScale) => {
    setDisplayScale(scale);
    showToast.success(`Display scale updated to ${scale}%`);
  };

  const handleContrastToggle = () => {
    const next = !settings.highContrast;
    setHighContrast(next);
    showToast.success(
      next ? "High contrast mode enabled" : "High contrast mode disabled"
    );
  };

  const handleMotionToggle = () => {
    const next = !settings.reduceMotion;
    setReduceMotion(next);
    showToast.success(
      next ? "Reduce motion enabled" : "Reduce motion disabled"
    );
  };

  const handleReset = () => {
    resetToDefaults();
    showToast.info("Accessibility preferences reset to default");
  };

  return (
    <div className="space-y-6">
      {/* MAIN ACCESSIBILITY CARD */}
      <section className="rounded-2xl border border-[#CBD5E1] bg-white p-6 shadow-2xs dark:border-[#1E3A47] dark:bg-[#0B202B] sm:p-7">
        {/* CARD HEADER */}
        <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-6 dark:border-[#1E3A47] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB] dark:bg-[#123C46] dark:text-[#38BDF8]">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
                  Accessibility & Display
                </h2>
                <span className="rounded-full bg-[#EAF7F9] px-2.5 py-0.5 text-[11px] font-semibold leading-[16px] text-[#087D8F] dark:bg-[#123C46] dark:text-[#38BDF8] border border-[#BCE4EA] dark:border-[#1E5260]">
                  System-wide
                </span>
              </div>
              <p className="mt-1 text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
                Adjust typography sizing, display scaling, contrast, and animation motion. Preferences persist automatically.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-9 items-center gap-1.5 self-start rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 text-[13px] font-semibold text-[#475569] transition hover:border-[#087D8F] hover:bg-white hover:text-[#087D8F] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:hover:border-[#38BDF8] dark:hover:text-[#38BDF8] cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Reset to Defaults</span>
          </button>
        </div>

        <div className="mt-6 space-y-7 divide-y divide-[#E2E8F0] dark:divide-[#1E3A47]">
          {/* ===================================================
              1. FONT SIZE CONTROLS
          =================================================== */}
          <div className="pt-1 first:pt-0">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={16} className="text-[#087D8F] dark:text-[#38BDF8]" />
                <h3 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                  Font Size
                </h3>
              </div>
              <span className="text-[12px] font-semibold capitalize text-[#087D8F] dark:text-[#38BDF8]">
                {settings.fontSize.replace("-", " ")}
              </span>
            </div>

            <p className="mb-4 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              Scales typography across all sidebars, headers, dashboards, cards, tables, forms, and modals.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {fontOptions.map((opt) => {
                const isActive = settings.fontSize === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleFontChange(opt.id)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all cursor-pointer ${
                      isActive
                        ? "border-[#087D8F] bg-[#EAF7F9] shadow-2xs dark:border-[#38BDF8] dark:bg-[#123C46]"
                        : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                    }`}
                  >
                    <span
                      className={`mb-1.5 text-base font-bold transition ${
                        isActive
                          ? "text-[#087D8F] dark:text-[#38BDF8]"
                          : "text-[#475569] group-hover:text-[#0F172A] dark:text-[#94A3B8] dark:group-hover:text-white"
                      }`}
                    >
                      {opt.sample}
                    </span>
                    <span
                      className={`text-[13px] font-semibold leading-[18px] ${
                        isActive
                          ? "text-[#087D8F] dark:text-[#38BDF8]"
                          : "text-[#0F172A] dark:text-white"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8]">
                      {opt.sub}
                    </span>
                    {isActive && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#087D8F] text-white dark:bg-[#38BDF8] dark:text-[#071926]">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================================================
              2. UI DISPLAY SCALE
          =================================================== */}
          <div className="pt-6">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Maximize2 size={16} className="text-[#087D8F] dark:text-[#38BDF8]" />
                <h3 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                  UI / Display Scale
                </h3>
              </div>
              <span className="text-[12px] font-semibold text-[#087D8F] dark:text-[#38BDF8]">
                {settings.displayScale}% Scale
              </span>
            </div>

            <p className="mb-4 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              Magnify or condense the entire application interface while preserving responsive layout behavior.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {scaleOptions.map((opt) => {
                const isActive = settings.displayScale === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleScaleChange(opt.id)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all cursor-pointer ${
                      isActive
                        ? "border-[#087D8F] bg-[#EAF7F9] shadow-2xs dark:border-[#38BDF8] dark:bg-[#123C46]"
                        : "border-[#CBD5E1] bg-white hover:border-[#94A3B8] hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                    }`}
                  >
                    <span
                      className={`text-lg font-bold ${
                        isActive
                          ? "text-[#087D8F] dark:text-[#38BDF8]"
                          : "text-[#0F172A] dark:text-white"
                      }`}
                    >
                      {opt.label}
                    </span>
                    <span className="mt-0.5 text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8]">
                      {opt.sub}
                    </span>
                    {isActive && (
                      <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#087D8F] text-white dark:bg-[#38BDF8] dark:text-[#071926]">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===================================================
              3. HIGH CONTRAST MODE
          =================================================== */}
          <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#123C46] dark:text-[#38BDF8]">
                <Sparkles size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                    High Contrast Mode
                  </h3>
                  {settings.highContrast && (
                    <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#16A34A] dark:bg-[#064E3B]/30 dark:text-[#34D399] border border-[#DCFCE7] dark:border-[#065F46]">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-xl text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                  Enhances border borders, button edges, and text contrast to maximize legibility and visual distinction.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.highContrast}
              onClick={handleContrastToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#087D8F] ${
                settings.highContrast ? "bg-[#087D8F]" : "bg-[#CBD5E1] dark:bg-[#1E3A47]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  settings.highContrast ? "translate-x-6 top-1" : "translate-x-1 top-1"
                }`}
              />
            </button>
          </div>

          {/* ===================================================
              4. REDUCE MOTION
          =================================================== */}
          <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] dark:bg-[#123C46] dark:text-[#38BDF8]">
                <ZapOff size={17} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                    Reduce Motion
                  </h3>
                  {settings.reduceMotion && (
                    <span className="rounded-full bg-[#F0FDF4] px-2 py-0.5 text-[10px] font-semibold text-[#16A34A] dark:bg-[#064E3B]/30 dark:text-[#34D399] border border-[#DCFCE7] dark:border-[#065F46]">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-xl text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
                  Minimizes transitions, sliding animations, and motion effects for users sensitive to motion.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.reduceMotion}
              onClick={handleMotionToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#087D8F] ${
                settings.reduceMotion ? "bg-[#087D8F]" : "bg-[#CBD5E1] dark:bg-[#1E3A47]"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                  settings.reduceMotion ? "translate-x-6 top-1" : "translate-x-1 top-1"
                }`}
              />
            </button>
          </div>

          {/* ===================================================
              5. THEME (APPEARANCE)
          =================================================== */}
          <div className="pt-6">
            <div className="mb-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-[#087D8F] dark:text-[#38BDF8]" />
                <h3 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                  Interface Theme
                </h3>
              </div>
              <span className="text-[12px] font-semibold capitalize text-[#087D8F] dark:text-[#38BDF8]">
                {theme} Mode
              </span>
            </div>

            <p className="mb-4 text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              Choose between light, dark, or system appearance mode.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setTheme("light");
                  showToast.success("Light theme activated");
                }}
                className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition cursor-pointer ${
                  theme === "light"
                    ? "border-[#087D8F] bg-[#EAF7F9] dark:border-[#38BDF8] dark:bg-[#123C46]"
                    : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    theme === "light"
                      ? "bg-[#087D8F] text-white"
                      : "bg-[#F1F5F9] text-[#475569] dark:bg-[#18333F] dark:text-[#CBD5E1]"
                  }`}
                >
                  <Sun size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                    Light Theme
                  </p>
                  <p className="text-[12px] font-normal leading-[16px] text-[#64748B] dark:text-[#94A3B8]">
                    Clean, high-brightness workspace
                  </p>
                </div>
                {theme === "light" && (
                  <CheckCircle2 size={18} className="text-[#087D8F] dark:text-[#38BDF8]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme("dark");
                  showToast.success("Dark theme activated");
                }}
                className={`flex items-center gap-3.5 rounded-xl border p-4 text-left transition cursor-pointer ${
                  theme === "dark"
                    ? "border-[#087D8F] bg-[#EAF7F9] dark:border-[#38BDF8] dark:bg-[#123C46]"
                    : "border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:hover:bg-[#102A38]"
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    theme === "dark"
                      ? "bg-[#087D8F] text-white"
                      : "bg-[#F1F5F9] text-[#475569] dark:bg-[#18333F] dark:text-[#CBD5E1]"
                  }`}
                >
                  <Moon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
                    Dark Theme
                  </p>
                  <p className="text-[12px] font-normal leading-[16px] text-[#64748B] dark:text-[#94A3B8]">
                    Low-light mode designed for eye comfort
                  </p>
                </div>
                {theme === "dark" && (
                  <CheckCircle2 size={18} className="text-[#087D8F] dark:text-[#38BDF8]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE PREVIEW CARD */}
      <section className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-6 shadow-2xs dark:border-[#1E3A47] dark:bg-[#0B202B]">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 dark:border-[#1E3A47]">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#087D8F] dark:text-[#38BDF8]">
              Live Component Preview
            </h3>
          </div>
          <span className="text-[11px] font-normal text-[#64748B] dark:text-[#94A3B8]">
            Updates automatically in real time
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-[#CBD5E1] bg-white p-4.5 dark:border-[#1E3A47] dark:bg-[#071926]">
          <div className="space-y-1">
            <h4 className="text-[14px] font-semibold leading-[20px] text-[#0F172A] dark:text-white">
              MindMatrix Workforce Management
            </h4>
            <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8]">
              Tasks, employees, schedules, and dashboard cards reflect your current accessibility settings.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-[#EAF7F9] px-3 py-1 text-[11px] font-semibold leading-[16px] text-[#087D8F] dark:bg-[#123C46] dark:text-[#38BDF8] border border-[#BCE4EA] dark:border-[#1E5260]">
              Active Task
            </span>
            <button
              type="button"
              className="rounded-lg bg-[#063B61] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#032F4D] dark:bg-[#0879D9] dark:hover:bg-[#0665B5] cursor-pointer"
            >
              Action Button
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
