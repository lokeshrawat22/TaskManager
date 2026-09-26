"use client";

import React, { ReactNode } from "react";
import {
  LucideIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  X,
  RefreshCw,
  Inbox,
  Clock,
} from "lucide-react";
import { GoToPage } from "@/components/ui/GoToPage";
export { GoToPage };

// =====================================================
// MINI BAR SPARKLINE CHART COMPONENT
// =====================================================

export function StatMiniBarChart({
  color,
  bars = [35, 55, 40, 70, 60, 85, 100],
}: {
  color: string;
  bars?: number[];
}) {
  return (
    <div className="flex items-end gap-[3px] h-[34px] w-[46px] shrink-0" aria-hidden="true">
      {bars.map((heightPercent, idx) => (
        <span
          key={idx}
          className="w-[3.5px] rounded-full transition-all duration-300"
          style={{
            height: `${Math.max(heightPercent, 18)}%`,
            backgroundColor: color,
            opacity: 0.35 + (idx / bars.length) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

// =====================================================
// PAGE HEADER (ENTERPRISE SAAS HIERARCHY)
// =====================================================

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-[#CBD5E1] dark:text-[#1E3A47]">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-[#2563EB] dark:hover:text-[#38BDF8] transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="font-semibold text-[#0F172A] dark:text-white">
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {eyebrow && (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#0284C7] dark:text-[#38BDF8]">
            {eyebrow}
          </p>
        )}

        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-[#EFF6FF] text-[#2563EB] shadow-xs dark:border-[#1E3A47] dark:bg-[#102A36] dark:text-[#38BDF8]">
              <Icon size={20} strokeWidth={2.2} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-[24px] sm:text-[28px] font-bold leading-tight tracking-[-0.02em] text-[#0F172A] dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-[13px] text-[#64748B] dark:text-[#94A3B8] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

// =====================================================
// STAT CARD (KPI - EXACT MATCH WITH ADMIN TASKS CARDS)
// =====================================================

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "teal" | "emerald" | "amber" | "rose" | "purple";
  change?: string | number;
  trend?: "up" | "down" | "neutral";
  changeLabel?: string;
  badge?: string;
  footer?: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  sparklineColor?: string;
  sparklineBars?: number[];
}

const variantStyles = {
  primary: {
    iconBg: "bg-[#EFF6FF] dark:bg-[#1E3A5F]",
    iconColor: "text-[#2563EB] dark:text-[#60A5FA]",
    valueColor: "text-[#0F172A] dark:text-white",
    subColor: "text-[#64748B] dark:text-[#94A3B8]",
    sparkline: "#3B82F6",
    activeBorder: "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]/30 dark:border-[#38BDF8] dark:bg-[#0C3345]",
    hoverBorder: "hover:border-[#2563EB] hover:bg-[#F8FAFC]",
  },
  teal: {
    iconBg: "bg-[#F0F9FF] dark:bg-[#0C384F]",
    iconColor: "text-[#0284C7] dark:text-[#38BDF8]",
    valueColor: "text-[#0284C7] dark:text-[#38BDF8]",
    subColor: "text-[#0284C7] dark:text-[#38BDF8]",
    sparkline: "#0EA5E9",
    activeBorder: "border-sky-400 bg-[#F0F9FF] ring-1 ring-sky-400/30 dark:border-sky-600 dark:bg-sky-950/30",
    hoverBorder: "hover:border-sky-400 hover:bg-[#F0F9FF]",
  },
  emerald: {
    iconBg: "bg-[#ECFDF5] dark:bg-[#064E3B]",
    iconColor: "text-[#00A878] dark:text-[#34D399]",
    valueColor: "text-[#00A878] dark:text-[#34D399]",
    subColor: "text-[#00A878] dark:text-[#34D399]",
    sparkline: "#00A878",
    activeBorder: "border-emerald-400 bg-[#F3FCF8] ring-1 ring-emerald-400/30 dark:border-emerald-600 dark:bg-emerald-950/30",
    hoverBorder: "hover:border-emerald-400 hover:bg-[#F8FDFB]",
  },
  amber: {
    iconBg: "bg-[#FFFBEB] dark:bg-[#451A03]",
    iconColor: "text-[#D97706] dark:text-[#FBBF24]",
    valueColor: "text-[#D97706] dark:text-[#FBBF24]",
    subColor: "text-[#D97706] dark:text-[#FBBF24]",
    sparkline: "#F59E0B",
    activeBorder: "border-amber-400 bg-[#FFFDF5] ring-1 ring-amber-400/30 dark:border-amber-600 dark:bg-amber-950/30",
    hoverBorder: "hover:border-amber-400 hover:bg-[#FFFDF7]",
  },
  rose: {
    iconBg: "bg-[#FEF2F2] dark:bg-rose-950/60",
    iconColor: "text-[#E5484D] dark:text-rose-300",
    valueColor: "text-[#E5484D] dark:text-rose-400",
    subColor: "text-[#E5484D] dark:text-rose-400",
    sparkline: "#EF5350",
    activeBorder: "border-rose-400 bg-[#FFF5F5] ring-1 ring-rose-400/30 dark:border-rose-600 dark:bg-rose-950/30",
    hoverBorder: "hover:border-rose-400 hover:bg-[#FFF8F8]",
  },
  purple: {
    iconBg: "bg-[#F5F3FF] dark:bg-[#2E1065]",
    iconColor: "text-[#7C3AED] dark:text-[#C4B5FD]",
    valueColor: "text-[#7C3AED] dark:text-[#C4B5FD]",
    subColor: "text-[#7C3AED] dark:text-[#C4B5FD]",
    sparkline: "#8B5CF6",
    activeBorder: "border-purple-400 bg-[#FAF5FF] ring-1 ring-purple-400/30 dark:border-purple-600 dark:bg-purple-950/30",
    hoverBorder: "hover:border-purple-400 hover:bg-[#FAF5FF]",
  },
};

const defaultBarsByVariant: Record<string, number[]> = {
  primary: [35, 55, 40, 70, 60, 85, 100],
  teal: [30, 50, 45, 65, 60, 80, 75],
  emerald: [38, 58, 52, 75, 68, 92, 88],
  amber: [25, 45, 35, 60, 50, 75, 65],
  rose: [20, 35, 18, 45, 25, 30, 42],
  purple: [30, 40, 50, 60, 70, 80, 90],
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  change,
  trend,
  changeLabel,
  badge,
  footer,
  onClick,
  isActive = false,
  className = "",
  sparklineColor,
  sparklineBars,
}: StatCardProps) {
  const styles = variantStyles[variant] || variantStyles.primary;
  const bars = sparklineBars || defaultBarsByVariant[variant] || defaultBarsByVariant.primary;
  const chartColor = sparklineColor || styles.sparkline;

  const Wrapper = onClick ? "button" : "div";
  const wrapperProps = onClick
    ? {
        type: "button" as const,
        onClick,
      }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={`group relative flex flex-col justify-between rounded-[12px] border p-4 sm:p-[16px_18px] text-left transition-all duration-200 hover:shadow-xs ${
        onClick ? "cursor-pointer" : ""
      } ${
        isActive
          ? styles.activeBorder
          : `border-[#CBD5E1] bg-white ${styles.hoverBorder} dark:border-[#2A4858] dark:bg-[#102A38] dark:hover:bg-[#132E3A]`
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-[6px] ${styles.iconBg} ${styles.iconColor}`}
          >
            <Icon size={13} strokeWidth={2.4} />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#CBD5E1]">
            {title}
          </span>
          {badge && (
            <span className="inline-flex items-center rounded-md bg-[#F1F5F9] px-1.5 py-0.2 text-[10px] font-semibold text-[#475569] dark:bg-[#1E3A47] dark:text-[#CBD5E1]">
              {badge}
            </span>
          )}
        </div>
        <ArrowUpRight
          size={14}
          className="text-[#64748B] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-[#718E9A]"
        />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <div
            className={`text-[28px] font-bold ${styles.valueColor} leading-[34px] tracking-[-0.02em] tabular-nums`}
          >
            {value}
          </div>
          {subtitle && (
            <div
              className={`mt-1 flex items-center gap-1 text-[12px] font-medium leading-[17px] ${styles.subColor}`}
            >
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        <StatMiniBarChart color={chartColor} bars={bars} />
      </div>

      {(change !== undefined || footer) && (
        <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-[11px] dark:border-[#1E3A47]">
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {trend === "up" && (
                <span className="flex items-center font-bold text-[#00A878] dark:text-[#34D399]">
                  <ArrowUpRight size={13} className="mr-0.5" />
                  {change}
                </span>
              )}
              {trend === "down" && (
                <span className="flex items-center font-bold text-[#DC2626] dark:text-[#F87171]">
                  <ArrowDownRight size={13} className="mr-0.5" />
                  {change}
                </span>
              )}
              {trend === "neutral" && (
                <span className="font-semibold text-[#64748B] dark:text-[#94A3B8]">
                  {change}
                </span>
              )}
              {changeLabel && (
                <span className="text-[#64748B] dark:text-[#94A3B8]">
                  {changeLabel}
                </span>
              )}
            </div>
          )}

          {footer && <div>{footer}</div>}
        </div>
      )}
    </Wrapper>
  );
}

// =====================================================
// SECTION CARD (PANEL CONTAINER)
// =====================================================

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  headerAction,
  children,
  footer,
  className = "",
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`
        rounded-[14px] border border-[#CBD5E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.03)]
        dark:border-[#1E3A47] dark:bg-[#0B202B] overflow-hidden ${className}
      `}
    >
      {(title || headerAction) && (
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4 dark:border-[#1E3A47]">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#F1F5F9] dark:bg-[#102A36] border border-[#CBD5E1] dark:border-[#1E3A47] text-[#1D4ED8] dark:text-[#38BDF8]">
                <Icon size={16} strokeWidth={2.2} />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-[15px] font-bold leading-tight text-[#0F172A] dark:text-white truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[12px] font-normal leading-[17px] text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={noPadding ? "" : "p-4 sm:p-5"}>{children}</div>

      {footer && (
        <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3 dark:border-[#1E3A47] dark:bg-[#081A24]">
          {footer}
        </div>
      )}
    </div>
  );
}

// =====================================================
// STATUS BADGE (MATCHES ADMIN PORTAL EXACTLY)
// =====================================================

export interface StatusBadgeProps {
  status?: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const s = String(status || "").toUpperCase().replace(/\s+/g, "_");

  if (s === "COMPLETED" || s === "DONE") {
    return (
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-emerald-300 bg-[#ECFDF5] px-2.5 text-[12px] font-semibold leading-[16px] text-[#00875A] dark:border-emerald-700 dark:bg-[#064E3B]/60 dark:text-[#34D399]">
        <CheckCircle2 size={12} strokeWidth={2.2} className="shrink-0 text-[#00875A] dark:text-[#34D399]" />
        Completed
      </span>
    );
  }

  if (s === "IN_PROGRESS" || s === "INPROGRESS" || s === "ACTIVE") {
    return (
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-sky-300 bg-[#EFF6FF] px-2.5 text-[12px] font-semibold leading-[16px] text-[#0284C7] dark:border-sky-700 dark:bg-[#1E3A5F]/60 dark:text-[#38BDF8]">
        <Clock3 size={12} strokeWidth={2.2} className="shrink-0 text-[#0284C7] dark:text-[#38BDF8]" />
        In Progress
      </span>
    );
  }

  if (s === "OVERDUE") {
    return (
      <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-rose-300 bg-[#FEF2F2] px-2.5 text-[12px] font-semibold leading-[16px] text-[#DC2626] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        <AlertTriangle size={12} strokeWidth={2.2} className="shrink-0 text-[#DC2626] dark:text-rose-300" />
        Overdue
      </span>
    );
  }

  return (
    <span className="inline-flex h-[24px] items-center gap-1.5 rounded-md border border-amber-300 bg-[#FFFBEB] px-2.5 text-[12px] font-semibold leading-[16px] text-[#D97706] dark:border-amber-700 dark:bg-[#451A03]/60 dark:text-[#FBBF24]">
      <Clock3 size={12} strokeWidth={2.2} className="shrink-0 text-[#D97706] dark:text-[#FBBF24]" />
      Pending
    </span>
  );
}

// =====================================================
// PRIORITY BADGE (MATCHES ADMIN PORTAL EXACTLY)
// =====================================================

export interface PriorityBadgeProps {
  priority?: string;
  showIcon?: boolean;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const p = String(priority || "").toUpperCase();

  if (p === "URGENT") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-rose-300 bg-[#FEF2F2] px-2 text-[12px] font-semibold leading-[16px] text-[#DC2626] dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        Urgent
      </span>
    );
  }

  if (p === "HIGH") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-amber-300 bg-[#FFFBEB] px-2 text-[12px] font-semibold leading-[16px] text-[#D97706] dark:border-amber-800 dark:bg-amber-950/60 dark:text-[#FBBF24]">
        High
      </span>
    );
  }

  if (p === "LOW") {
    return (
      <span className="inline-flex h-[22px] items-center rounded-[6px] border border-emerald-300 bg-[#ECFDF5] px-2 text-[12px] font-semibold leading-[16px] text-[#059669] dark:border-emerald-800 dark:bg-[#064E3B]/60 dark:text-[#34D399]">
        Low
      </span>
    );
  }

  return (
    <span className="inline-flex h-[22px] items-center rounded-[6px] border border-sky-300 bg-[#F0F9FF] px-2 text-[12px] font-semibold leading-[16px] text-[#0284C7] dark:border-sky-800 dark:bg-sky-950/60 dark:text-[#38BDF8]">
      Medium
    </span>
  );
}

// =====================================================
// SEARCH INPUT (ENTERPRISE TOOLBAR STYLE)
// =====================================================

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}: SearchInputProps) {
  return (
    <div
      className={`relative flex h-[38px] items-center rounded-[8px] border border-[#CBD5E1] bg-[#FBFDFE] px-3 transition-colors focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB] dark:border-[#2A4858] dark:bg-[#0D2430] ${className}`}
    >
      <Search
        size={15}
        className="shrink-0 text-[#64748B] dark:text-[#94A3B8]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent px-2.5 text-[13px] font-normal text-[#0F172A] outline-none placeholder:text-[#64748B] dark:text-white dark:placeholder:text-[#94A3B8]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] cursor-pointer"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF7FB] text-[#087D8F] dark:bg-[#123C46] dark:text-[#4CD2DA]">
        <Icon size={22} />
      </div>
      <p className="mt-3 text-[14px] font-semibold text-[#0F172A] dark:text-[#E5F1F5]">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-[12px] font-normal text-[#64748B] dark:text-[#8FA8B2]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// =====================================================
// LOADING SKELETON STATE
// =====================================================

export function LoadingState({
  rows = 4,
  message = "Loading...",
}: {
  rows?: number;
  message?: string;
}) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#E2E8F0] border-t-[#2563EB] dark:border-[#1E3A47] dark:border-t-[#38BDF8]" />
        <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
          {message}
        </span>
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full animate-pulse rounded-xl bg-[#F1F5F9] dark:bg-[#102A36]"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

// =====================================================
// ERROR STATE
// =====================================================

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FECACA] bg-[#FEF2F2] text-[#DC2626] dark:border-[#611C23] dark:bg-[#3A1418] dark:text-[#F87171]">
        <AlertCircle size={24} />
      </div>
      <h3 className="mt-3 text-sm font-bold text-[#DC2626] dark:text-[#F87171]">
        Failed to load content
      </h3>
      <p className="mt-1 max-w-sm text-xs text-[#64748B] dark:text-[#94A3B8]">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F172A] shadow-xs hover:bg-[#F8FAFC] dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-white dark:hover:bg-[#102A36] cursor-pointer"
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}

// =====================================================
// PAGINATION
// =====================================================

export interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = totalItems ? Math.min(page * pageSize, totalItems) : page * pageSize;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E5E7EB] px-4 py-3 text-xs dark:border-[#18333F] flex-wrap">
      <div className="text-[#64748B] dark:text-[#94A3B8]">
        {totalItems ? (
          <>
            Showing <span className="font-semibold text-[#0F172A] dark:text-white">{start}</span> to{" "}
            <span className="font-semibold text-[#0F172A] dark:text-white">{end}</span> of{" "}
            <span className="font-semibold text-[#0F172A] dark:text-white">{totalItems}</span> results
          </>
        ) : (
          <>
            Page <span className="font-semibold text-[#0F172A] dark:text-white">{page}</span> of{" "}
            <span className="font-semibold text-[#0F172A] dark:text-white">{totalPages}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] transition hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:hover:bg-[#102A36] cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="px-2 font-semibold text-[#0F172A] dark:text-white">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#CBD5E1] bg-white text-[#475569] transition hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed dark:border-[#1E3A47] dark:bg-[#0B202B] dark:text-[#CBD5E1] dark:hover:bg-[#102A36] cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <GoToPage
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}

// =====================================================
// PROGRESS BAR
// =====================================================

export function ProgressBar({
  percentage: pct,
  label,
  color = "blue",
  size = "md",
}: {
  percentage: number;
  label?: string;
  color?: "teal" | "blue" | "emerald" | "amber" | "rose";
  size?: "sm" | "md" | "lg";
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));

  const colorMap = {
    teal: "bg-[#0284C7] dark:bg-[#38BDF8]",
    blue: "bg-[#2563EB] dark:bg-[#38BDF8]",
    emerald: "bg-[#00A878] dark:bg-[#34D399]",
    amber: "bg-[#F59E0B] dark:bg-[#FBBF24]",
    rose: "bg-[#DC2626] dark:bg-[#F87171]",
  };

  const heightMap = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-2.5",
  };

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex justify-between text-xs">
          <span className="font-medium text-[#64748B] dark:text-[#94A3B8]">{label}</span>
          <span className="font-bold text-[#0F172A] dark:text-white">{clamped}%</span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-[#F1F5F9] dark:bg-[#1E3A47] ${heightMap[size]}`}
      >
        <div
          className={`${colorMap[color]} ${heightMap[size]} rounded-full transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
