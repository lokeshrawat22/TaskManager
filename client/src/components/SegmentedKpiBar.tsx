"use client";

import React from "react";

// =====================================================
// TYPES
// =====================================================

export interface SegmentedKpiItem {
  id?: string;
  icon: React.ReactNode;
  iconBg?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  supportingText?: React.ReactNode;
  trend?: React.ReactNode;
  badge?: React.ReactNode;
  isActive?: boolean;
  activeColor?: string;
  onClick?: () => void;
}

export interface SegmentedKpiBarProps {
  items: SegmentedKpiItem[];
  className?: string;
}

// =====================================================
// HELPER: Responsive Divider Borders
// =====================================================

function getSegmentBorderClass(index: number, total: number): string {
  // Mobile (<sm): border-b between items
  // Tablet (sm -> lg, 2 columns):
  //   Index 0: right & bottom
  //   Index 1: bottom
  //   Index 2: right
  //   Index 3: none
  // Desktop (lg+, 4 columns):
  //   All except last: border-r, no border-b
  if (total <= 1) return "";

  if (index === 0) {
    return "border-b border-[#E2E8F0] dark:border-[#2A4858] sm:border-r sm:border-b lg:border-b-0 lg:border-r";
  }
  if (index === 1) {
    return "border-b border-[#E2E8F0] dark:border-[#2A4858] sm:border-b sm:border-r-0 lg:border-b-0 lg:border-r";
  }
  if (index === 2) {
    return "border-b border-[#E2E8F0] dark:border-[#2A4858] sm:border-b-0 sm:border-r lg:border-r";
  }
  if (index === 3) {
    return "border-0 sm:border-0 lg:border-0";
  }

  return "border-b border-[#E2E8F0] dark:border-[#2A4858] lg:border-b-0 lg:border-r lg:last:border-r-0";
}

// =====================================================
// SEGMENTED KPI BAR COMPONENT
// =====================================================

export default function SegmentedKpiBar({
  items,
  className = "",
}: SegmentedKpiBarProps) {
  if (!items || items.length === 0) return null;

  return (
    <div
      className={`
        w-full
        rounded-[14px]
        border
        border-[#E2E8F0]
        bg-white
        shadow-xs
        overflow-hidden
        dark:border-[#2A4858]
        dark:bg-[#102A38]
        ${className}
      `}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const borderClass = getSegmentBorderClass(index, items.length);
          const isInteractive = Boolean(item.onClick);

          return (
            <div
              key={item.id || index}
              role={isInteractive ? "button" : undefined}
              tabIndex={isInteractive ? 0 : undefined}
              onClick={item.onClick}
              onKeyDown={(e) => {
                if (isInteractive && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  item.onClick?.();
                }
              }}
              className={`
                group
                relative
                flex
                items-center
                gap-3.5
                p-4
                sm:px-5
                sm:py-4
                transition-colors
                duration-150
                ${borderClass}
                ${
                  isInteractive
                    ? "cursor-pointer hover:bg-[#F8FAFC] dark:hover:bg-[#133242] focus:outline-none focus:bg-[#F8FAFC] dark:focus:bg-[#133242]"
                    : ""
                }
                ${
                  item.isActive
                    ? "bg-[#F0F7FF]/70 dark:bg-[#133248]"
                    : ""
                }
              `}
            >
              {/* Active Indicator Bar */}
              {item.isActive && (
                <span
                  className="absolute inset-x-4 bottom-0 h-[2.5px] rounded-full bg-[#2563EB]"
                  style={
                    item.activeColor
                      ? { backgroundColor: item.activeColor }
                      : undefined
                  }
                  aria-hidden="true"
                />
              )}

              {/* Compact Icon */}
              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  ${
                    item.iconBg ||
                    "bg-[#EFF6FF] text-[#2563EB] dark:bg-[#1E3A5F] dark:text-[#60A5FA]"
                  }
                `}
              >
                {item.icon}
              </div>

              {/* Text & Values */}
              <div className="min-w-0 flex-1">
                {/* Label Row */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="truncate text-[12.5px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {item.label}
                  </span>

                  {item.trend ? (
                    <span className="shrink-0">{item.trend}</span>
                  ) : item.badge ? (
                    <span className="shrink-0">{item.badge}</span>
                  ) : null}
                </div>

                {/* Main Metric Value */}
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[24px] font-[750] leading-tight tracking-tight tabular-nums text-[#0F172A] dark:text-white">
                    {item.value}
                  </span>
                </div>

                {/* Supporting Text */}
                {item.supportingText && (
                  <p className="mt-0.5 truncate text-[11.5px] font-[450] leading-tight text-[#94A3B8] dark:text-[#64748B]">
                    {item.supportingText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
