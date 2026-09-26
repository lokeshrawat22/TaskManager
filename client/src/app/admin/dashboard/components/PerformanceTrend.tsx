"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { RecentTaskItem } from "../types";

interface PerformanceTrendProps {
  tasks: RecentTaskItem[];
}

type PerformanceTimeRange = "7D" | "30D" | "90D" | "YEAR";

interface VelocityBucket {
  label: string;
  subLabel: string;
  fullDate: string;
  created: number;
  completed: number;
  overdue: number;
  totalVolume: number;
  efficiency: number; // 0 - 100%
}

export default function PerformanceTrend({ tasks }: PerformanceTrendProps) {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState<PerformanceTimeRange>("7D");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // ===================================================
  // 1. DYNAMIC BUCKETS & TIME-RANGE AGGREGATION
  // ===================================================
  const buckets: VelocityBucket[] = useMemo(() => {
    const now = new Date();
    const result: VelocityBucket[] = [];

    if (timeRange === "7D") {
      // 7 consecutive days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayName = d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { weekday: "short" });
        const dateNum = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        const fullDateStr = d.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

        let created = 0;
        let completed = 0;
        let overdue = 0;

        tasks.forEach((t) => {
          const cTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
          if (cTime >= start && cTime <= end) created++;

          const isComp = String(t.status || "").toUpperCase() === "COMPLETED";
          const compTime = (t as any).completedAt
            ? new Date((t as any).completedAt).getTime()
            : (t as any).updatedAt
            ? new Date((t as any).updatedAt).getTime()
            : 0;

          if (isComp && compTime >= start && compTime <= end) completed++;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (dueTime >= start && dueTime <= end && !isComp) {
              overdue++;
            }
          }
        });

        const totalVolume = created + completed + overdue;
        // Delivery Efficiency: completed vs (completed + overdue)
        let efficiency = 100;
        if (completed + overdue > 0) {
          efficiency = Math.round((completed / (completed + overdue)) * 100);
        } else if (totalVolume === 0) {
          efficiency = 100;
        }

        result.push({
          label: dayName,
          subLabel: dateNum,
          fullDate: fullDateStr,
          created,
          completed,
          overdue,
          totalVolume,
          efficiency,
        });
      }
    } else if (timeRange === "30D") {
      // 6 intervals of 5 days each
      for (let i = 5; i >= 0; i--) {
        const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 5);
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 5 + 4));

        const label = `${dStart.getDate()}-${dEnd.getDate()}`;
        const subLabel = dEnd.toLocaleDateString("en-GB", { month: "short" });
        const fullDateStr = `${dStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${dEnd.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

        const start = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 0, 0, 0, 0).getTime();
        const end = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59, 999).getTime();

        let created = 0;
        let completed = 0;
        let overdue = 0;

        tasks.forEach((t) => {
          const cTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
          if (cTime >= start && cTime <= end) created++;

          const isComp = String(t.status || "").toUpperCase() === "COMPLETED";
          const compTime = (t as any).completedAt
            ? new Date((t as any).completedAt).getTime()
            : (t as any).updatedAt
            ? new Date((t as any).updatedAt).getTime()
            : 0;
          if (isComp && compTime >= start && compTime <= end) completed++;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (dueTime >= start && dueTime <= end && !isComp) {
              overdue++;
            }
          }
        });

        const totalVolume = created + completed + overdue;
        let efficiency = 100;
        if (completed + overdue > 0) {
          efficiency = Math.round((completed / (completed + overdue)) * 100);
        }

        result.push({
          label,
          subLabel,
          fullDate: fullDateStr,
          created,
          completed,
          overdue,
          totalVolume,
          efficiency,
        });
      }
    } else if (timeRange === "90D") {
      // 6 intervals of 15 days each
      for (let i = 5; i >= 0; i--) {
        const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 15);
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i * 15 + 14));

        const label = `${dStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
        const subLabel = `${dEnd.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`;
        const fullDateStr = `${label} - ${subLabel} ${dEnd.getFullYear()}`;

        const start = new Date(dStart.getFullYear(), dStart.getMonth(), dStart.getDate(), 0, 0, 0, 0).getTime();
        const end = new Date(dEnd.getFullYear(), dEnd.getMonth(), dEnd.getDate(), 23, 59, 59, 999).getTime();

        let created = 0;
        let completed = 0;
        let overdue = 0;

        tasks.forEach((t) => {
          const cTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
          if (cTime >= start && cTime <= end) created++;

          const isComp = String(t.status || "").toUpperCase() === "COMPLETED";
          const compTime = (t as any).completedAt
            ? new Date((t as any).completedAt).getTime()
            : (t as any).updatedAt
            ? new Date((t as any).updatedAt).getTime()
            : 0;
          if (isComp && compTime >= start && compTime <= end) completed++;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (dueTime >= start && dueTime <= end && !isComp) {
              overdue++;
            }
          }
        });

        const totalVolume = created + completed + overdue;
        let efficiency = 100;
        if (completed + overdue > 0) {
          efficiency = Math.round((completed / (completed + overdue)) * 100);
        }

        result.push({
          label,
          subLabel,
          fullDate: fullDateStr,
          created,
          completed,
          overdue,
          totalVolume,
          efficiency,
        });
      }
    } else {
      // Current year months
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const monthsToShow = Math.min(12, currentMonth + 1);

      for (let m = 0; m < monthsToShow; m++) {
        const dStart = new Date(currentYear, m, 1, 0, 0, 0, 0);
        const dEnd = new Date(currentYear, m + 1, 0, 23, 59, 59, 999);
        const monthName = dStart.toLocaleDateString(language === "hi" ? "hi-IN" : "en-GB", { month: "short" });

        const start = dStart.getTime();
        const end = dEnd.getTime();

        let created = 0;
        let completed = 0;
        let overdue = 0;

        tasks.forEach((t) => {
          const cTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
          if (cTime >= start && cTime <= end) created++;

          const isComp = String(t.status || "").toUpperCase() === "COMPLETED";
          const compTime = (t as any).completedAt
            ? new Date((t as any).completedAt).getTime()
            : (t as any).updatedAt
            ? new Date((t as any).updatedAt).getTime()
            : 0;
          if (isComp && compTime >= start && compTime <= end) completed++;

          if (t.dueDate) {
            const dueTime = new Date(t.dueDate).getTime();
            if (dueTime >= start && dueTime <= end && !isComp) {
              overdue++;
            }
          }
        });

        const totalVolume = created + completed + overdue;
        let efficiency = 100;
        if (completed + overdue > 0) {
          efficiency = Math.round((completed / (completed + overdue)) * 100);
        }

        result.push({
          label: monthName,
          subLabel: String(currentYear),
          fullDate: `${monthName} ${currentYear}`,
          created,
          completed,
          overdue,
          totalVolume,
          efficiency,
        });
      }
    }

    return result;
  }, [tasks, timeRange, language]);

  // ===================================================
  // 2. SUMMARY TOTALS
  // ===================================================
  const totalCreated = useMemo(() => buckets.reduce((acc, b) => acc + b.created, 0), [buckets]);
  const totalCompleted = useMemo(() => buckets.reduce((acc, b) => acc + b.completed, 0), [buckets]);
  const totalOverdue = useMemo(() => buckets.reduce((acc, b) => acc + b.overdue, 0), [buckets]);
  const avgEfficiency = useMemo(() => {
    if (totalCompleted + totalOverdue === 0) return 100;
    return Math.round((totalCompleted / (totalCompleted + totalOverdue)) * 100);
  }, [totalCompleted, totalOverdue]);

  // ===================================================
  // 3. SCALE CALCULATION
  // ===================================================
  const maxBarVolume = useMemo(() => {
    let m = 1;
    buckets.forEach((b) => {
      m = Math.max(m, b.totalVolume);
    });
    return Math.max(4, Math.ceil(m * 1.25));
  }, [buckets]);

  // SVG Dimension Constants
  const chartWidth = 1200;
  const chartHeight = 250;
  const paddingLeft = 68; // reserved space for left Y-axis (Task Volume & ticks)
  const paddingRight = 68; // reserved space for right Y-axis (Efficiency % & ticks)
  const paddingTop = 22;
  const paddingBottom = 34;

  const usableWidth = chartWidth - paddingLeft - paddingRight;
  const usableHeight = chartHeight - paddingTop - paddingBottom;
  const groundY = paddingTop + usableHeight;

  const slotWidth = usableWidth / (buckets.length || 1);
  const barWidth = Math.min(52, slotWidth * 0.48);

  // Left Y-Axis Volume Ticks
  const volumeTicks = useMemo(() => {
    const step = maxBarVolume / 4;
    return [0, step, step * 2, step * 3, maxBarVolume].map((v) => Math.round(v));
  }, [maxBarVolume]);

  // Right Y-Axis Efficiency Ticks (0%, 25%, 50%, 75%, 100%)
  const efficiencyTicks = [0, 25, 50, 75, 100];

  // Coordinates for Efficiency Spline Points
  const splinePoints = useMemo(() => {
    return buckets.map((b, i) => {
      const x = paddingLeft + i * slotWidth + slotWidth / 2;
      const y = paddingTop + usableHeight * (1 - Math.min(100, Math.max(0, b.efficiency)) / 100);
      return { x, y, efficiency: b.efficiency };
    });
  }, [buckets, paddingLeft, slotWidth, paddingTop, usableHeight]);

  // Cubic Bezier Spline Path Generator
  const { splinePath, splineAreaPath } = useMemo(() => {
    if (splinePoints.length === 0) return { splinePath: "", splineAreaPath: "" };
    if (splinePoints.length === 1) {
      return {
        splinePath: `M ${splinePoints[0].x} ${splinePoints[0].y}`,
        splineAreaPath: "",
      };
    }

    let path = `M ${splinePoints[0].x.toFixed(1)} ${splinePoints[0].y.toFixed(1)}`;

    for (let i = 0; i < splinePoints.length - 1; i++) {
      const p0 = splinePoints[i === 0 ? 0 : i - 1];
      const p1 = splinePoints[i];
      const p2 = splinePoints[i + 1];
      const p3 = splinePoints[i + 2 < splinePoints.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const firstX = splinePoints[0].x;
    const lastX = splinePoints[splinePoints.length - 1].x;
    const area = `${path} L ${lastX.toFixed(1)} ${groundY.toFixed(1)} L ${firstX.toFixed(1)} ${groundY.toFixed(1)} Z`;

    return { splinePath: path, splineAreaPath: area };
  }, [splinePoints, groundY]);

  return (
    <div className="w-full col-span-12 rounded-xl border border-[#CBD5E1] bg-white p-4 sm:p-5 shadow-2xs dark:border-[#1E435E] dark:bg-[#0B2538]">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] leading-[16px] text-[#475569] dark:text-[#94A3B8]">
            {language === "hi" ? "प्रदर्शन रुझान" : "PERFORMANCE TREND"}
          </p>
          <h2 className="mt-0.5 text-[20px] font-bold leading-[26px] tracking-[-0.02em] text-[#0F172A] dark:text-white">
            {language === "hi" ? "कार्यबल गतिविधि और वितरण रुझान" : "Workforce activity & delivery trend"}
          </h2>
          <p className="mt-0.5 text-[12px] sm:text-[13px] font-normal leading-[18px] text-[#64748B] dark:text-[#94A3B8]">
            {language === "hi"
              ? "समय के साथ कार्य निर्माण, पूर्णता वेग और वितरण दक्षता दर।"
              : "Dynamic task creation, completion velocity, and delivery efficiency over time."}
          </p>
        </div>

        {/* Legend + Time Range Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3.5 self-start lg:self-center">
          {/* Production-Grade Semantic Legend */}
          <div className="hidden sm:flex items-center gap-3 pr-3 border-r border-[#CBD5E1] dark:border-[#1E435E]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[3px] bg-[#00A6C7]" />
              <span className="text-[12px] font-medium leading-[17px] text-[#475569] dark:text-[#CBD5E1]">
                {language === "hi" ? "निर्मित" : "Created"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[3px] bg-[#00A878]" />
              <span className="text-[12px] font-medium leading-[17px] text-[#475569] dark:text-[#CBD5E1]">
                {language === "hi" ? "पूर्ण" : "Completed"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[3px] bg-[#DC2626]" />
              <span className="text-[12px] font-medium leading-[17px] text-[#475569] dark:text-[#CBD5E1]">
                {language === "hi" ? "अतिदेय" : "Overdue"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-3 rounded-full bg-[#2563EB]" />
              <span className="text-[12px] font-medium leading-[17px] text-[#475569] dark:text-[#CBD5E1]">
                {language === "hi" ? "दक्षता %" : "Efficiency %"}
              </span>
            </div>
          </div>

          {/* Time Range Button Group */}
          <div
            className="inline-flex rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] p-0.5 dark:border-[#1E435E] dark:bg-[#071F2C]"
            role="group"
            aria-label="Performance Time Range"
          >
            {(["7D", "30D", "90D", "YEAR"] as PerformanceTimeRange[]).map((tab) => {
              const labelMap: Record<PerformanceTimeRange, string> = {
                "7D": language === "hi" ? "7 दिन" : "7 Days",
                "30D": language === "hi" ? "30 दिन" : "30 Days",
                "90D": language === "hi" ? "90 दिन" : "90 Days",
                YEAR: t("common.thisYear") || "This Year",
              };
              const isSelected = timeRange === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setTimeRange(tab);
                    setHoveredIndex(null);
                  }}
                  className={`rounded-md px-2.5 py-1 text-[12px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#0F172A] font-semibold leading-[17px] border border-[#CBD5E1] shadow-xs dark:bg-[#102A38] dark:text-white"
                      : "text-[#475569] font-medium leading-[17px] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white"
                  }`}
                  aria-pressed={isSelected}
                >
                  {labelMap[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Quick-Stats Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3 sm:mt-3.5 mb-1">
        {/* Created Tasks */}
        <div className="h-[76px] rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 dark:border-[#1E435E] dark:bg-[#071F2C] transition hover:border-[#2563EB]/50 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#94A3B8] truncate">
              {language === "hi" ? "कुल निर्मित कार्य" : "Tasks Created"}
            </span>
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] dark:text-white tabular-nums tracking-[-0.02em] leading-[26px]">
            {totalCreated}
          </p>
        </div>

        {/* Completed Tasks */}
        <div className="h-[76px] rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 dark:border-[#1E435E] dark:bg-[#071F2C] transition hover:border-emerald-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#16A34A] shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#94A3B8] truncate">
              {language === "hi" ? "पूर्ण किए गए" : "Completed"}
            </span>
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#16A34A] tabular-nums tracking-[-0.02em] leading-[26px]">
            {totalCompleted}
          </p>
        </div>

        {/* Overdue Tasks */}
        <div className="h-[76px] rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 dark:border-[#1E435E] dark:bg-[#071F2C] transition hover:border-rose-300 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#DC2626] shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#94A3B8] truncate">
              {language === "hi" ? "अतिदेय (Overdue)" : "Overdue"}
            </span>
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#DC2626] tabular-nums tracking-[-0.02em] leading-[26px]">
            {totalOverdue}
          </p>
        </div>

        {/* Avg Delivery Efficiency */}
        <div className="h-[76px] rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 dark:border-[#1E435E] dark:bg-[#071F2C] transition hover:border-[#2563EB]/50 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] leading-[16px] text-[#475569] dark:text-[#94A3B8] truncate">
              {language === "hi" ? "औसत वितरण दक्षता" : "Delivery Efficiency"}
            </span>
          </div>
          <p className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] dark:text-[#38BDF8] tabular-nums tracking-[-0.02em] leading-[26px]">
            {avgEfficiency}%
          </p>
        </div>
      </div>

      {/* SVG Stacked Velocity Bars + Smooth Efficiency Spline Chart */}
      <div className="relative mt-3 sm:mt-3.5 w-full select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="w-full h-[240px] sm:h-[265px] lg:h-[285px] block overflow-visible"
        >
          <defs>
            {/* Completed Bar (Emerald #00A878) */}
            <linearGradient id="barCompletedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A878" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00A878" stopOpacity="0.75" />
            </linearGradient>

            {/* Created Bar (Brand Cyan #00A6C7) */}
            <linearGradient id="barCreatedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A6C7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#00A6C7" stopOpacity="0.75" />
            </linearGradient>

            {/* Overdue Bar (Rose #E5484D) */}
            <linearGradient id="barOverdueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E5484D" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#E5484D" stopOpacity="0.75" />
            </linearGradient>

            {/* Translucent Area Gradient for Efficiency Curve */}
            <linearGradient id="efficiencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A6C7" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#00A6C7" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#00A6C7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Left Y-Axis Label: Task Volume */}
          <text
            x={12}
            y={paddingTop - 10}
            textAnchor="start"
            className="fill-[#475569] text-[11px] font-medium dark:fill-[#94A3B8]"
          >
            {language === "hi" ? "कार्य मात्रा" : "Task Volume"}
          </text>

          {/* Right Y-Axis Label: Efficiency % */}
          <text
            x={chartWidth - 14}
            y={paddingTop - 10}
            textAnchor="end"
            className="fill-[#1D4ED8] text-[11px] font-medium dark:fill-[#38BDF8]"
          >
            {language === "hi" ? "दक्षता %" : "Efficiency %"}
          </text>

          {/* Horizontal Gridlines & Left Volume Ticks */}
          {volumeTicks.map((tickVal) => {
            const y = paddingTop + usableHeight * (1 - tickVal / maxBarVolume);
            return (
              <g key={`vol_${tickVal}`}>
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#475569] text-[11px] font-medium dark:fill-[#CBD5E1]"
                >
                  {tickVal}
                </text>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeDasharray="4 4"
                  className="dark:stroke-[#1A374D]"
                />
              </g>
            );
          })}

          {/* Right Y-Axis Efficiency Ticks */}
          {efficiencyTicks.map((pct) => {
            const y = paddingTop + usableHeight * (1 - pct / 100);
            return (
              <text
                key={`eff_${pct}`}
                x={chartWidth - paddingRight + 10}
                y={y + 4}
                textAnchor="start"
                className="fill-[#1D4ED8] text-[11px] font-medium dark:fill-[#38BDF8]"
              >
                {pct}%
              </text>
            );
          })}

          {/* X-Axis Ground Line */}
          <line
            x1={paddingLeft}
            y1={groundY}
            x2={chartWidth - paddingRight}
            y2={groundY}
            stroke="#CBD5E1"
            className="dark:stroke-[#234A6B]"
            strokeWidth="1"
          />

          {/* 1. STACKED VELOCITY BARS */}
          {buckets.map((b, i) => {
            const isHovered = hoveredIndex === i;
            const x = paddingLeft + i * slotWidth + (slotWidth - barWidth) / 2;

            const hCompleted = (b.completed / maxBarVolume) * usableHeight;
            const hCreated = (b.created / maxBarVolume) * usableHeight;
            const hOverdue = (b.overdue / maxBarVolume) * usableHeight;

            const yCompleted = groundY - hCompleted;
            const yCreated = yCompleted - hCreated;
            const yOverdue = yCreated - hOverdue;

            return (
              <g key={i} className="transition-all duration-200">
                {/* Background Slot Highlight on Hover */}
                {isHovered && (
                  <rect
                    x={paddingLeft + i * slotWidth + 4}
                    y={paddingTop}
                    width={slotWidth - 8}
                    height={usableHeight}
                    rx="6"
                    fill="#2563EB"
                    fillOpacity="0.04"
                    className="dark:fill-[#38BDF8] dark:fill-opacity-5"
                  />
                )}

                {/* Completed Layer (Bottom) */}
                {b.completed > 0 && (
                  <rect
                    x={x}
                    y={yCompleted}
                    width={barWidth}
                    height={hCompleted}
                    rx={b.created === 0 && b.overdue === 0 ? "4" : "1"}
                    fill="url(#barCompletedGrad)"
                    stroke="#16A34A"
                    strokeWidth="0.75"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Created Layer (Middle) */}
                {b.created > 0 && (
                  <rect
                    x={x}
                    y={yCreated}
                    width={barWidth}
                    height={hCreated}
                    rx={b.overdue === 0 ? "4" : "1"}
                    fill="url(#barCreatedGrad)"
                    stroke="#2563EB"
                    strokeWidth="0.75"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Overdue Layer (Top) */}
                {b.overdue > 0 && (
                  <rect
                    x={x}
                    y={yOverdue}
                    width={barWidth}
                    height={hOverdue}
                    rx="4"
                    fill="url(#barOverdueGrad)"
                    stroke="#DC2626"
                    strokeWidth="0.75"
                    strokeOpacity="0.8"
                  />
                )}

                {/* Optional Total Volume Label Above Bar */}
                {b.totalVolume > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={Math.min(yCompleted, yCreated, yOverdue) - 5}
                    textAnchor="middle"
                    className={`text-[11px] font-semibold leading-[16px] tabular-nums transition-opacity duration-150 ${
                      isHovered
                        ? "fill-[#0F172A] dark:fill-white opacity-100"
                        : "fill-[#334155] dark:fill-[#CBD5E1] opacity-90"
                    }`}
                  >
                    {b.totalVolume}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. OVERLAID DELIVERY EFFICIENCY SPLINE AREA & CURVE */}
          {splineAreaPath && (
            <path
              d={splineAreaPath}
              fill="url(#efficiencyAreaGrad)"
              className="pointer-events-none"
            />
          )}

          {splinePath && (
            <path
              d={splinePath}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 pointer-events-none"
            />
          )}

          {/* Active Hover Crosshair Line */}
          {hoveredIndex !== null && splinePoints[hoveredIndex] && (
            <line
              x1={splinePoints[hoveredIndex].x}
              y1={paddingTop}
              x2={splinePoints[hoveredIndex].x}
              y2={groundY}
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="dark:stroke-[#38BDF8]"
            />
          )}

          {/* Spline Milestone Dots */}
          {splinePoints.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3}
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth={isHovered ? 2 : 1.5}
                className="transition-all duration-150 pointer-events-none drop-shadow-xs"
              />
            );
          })}

          {/* 3. X-AXIS LABELS */}
          {buckets.map((b, i) => {
            const xCenter = paddingLeft + i * slotWidth + slotWidth / 2;
            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                <line
                  x1={xCenter}
                  y1={groundY}
                  x2={xCenter}
                  y2={groundY + 3}
                  stroke="#CBD5E1"
                  strokeWidth="1"
                  className="dark:stroke-[#234A6B]"
                />
                <text
                  x={xCenter}
                  y={groundY + 14}
                  textAnchor="middle"
                  className={`text-[11px] transition-colors ${
                    isHovered
                      ? "fill-[#0F172A] font-semibold dark:fill-white"
                      : "fill-[#475569] font-medium dark:fill-[#CBD5E1]"
                  }`}
                >
                  {b.label}
                </text>
                <text
                  x={xCenter}
                  y={groundY + 25}
                  textAnchor="middle"
                  className="fill-[#64748B] text-[11px] font-normal leading-[16px] dark:fill-[#94A3B8]"
                >
                  {b.subLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 4. TRANSPARENT HOVER OVERLAY & INTERACTIVE TOOLTIP */}
        <div
          className="absolute inset-0 flex"
          style={{
            left: `${(paddingLeft / chartWidth) * 100}%`,
            right: `${(paddingRight / chartWidth) * 100}%`,
            top: `${(paddingTop / chartHeight) * 100}%`,
            bottom: `${(paddingBottom / chartHeight) * 100}%`,
          }}
        >
          {buckets.map((b, i) => {
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={i}
                className="relative flex-1 h-full cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Floating Interactive Tooltip */}
                {isHovered && (
                  <div
                    className={`absolute z-30 min-w-[190px] rounded-lg border border-[#CBD5E1] bg-white/98 p-3 shadow-md backdrop-blur-md dark:border-[#1E435E] dark:bg-[#0B2538]/95 pointer-events-none text-left bottom-[60%] ${
                      i > buckets.length / 2 ? "right-0" : "left-0"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 dark:border-[#163854]">
                      <span className="text-[12px] font-semibold leading-[17px] text-[#0F172A] dark:text-white">
                        {b.fullDate}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-[16px] ${
                          b.efficiency >= 80
                            ? "bg-[#F0FDF4] text-[#16A34A]"
                            : b.efficiency >= 50
                            ? "bg-[#FFFBEB] text-[#D97706]"
                            : "bg-[#FEF2F2] text-[#DC2626]"
                        }`}
                      >
                        {b.efficiency}% {b.efficiency >= 80 ? "High" : b.efficiency >= 50 ? "Moderate" : "At Risk"}
                      </span>
                    </div>

                    {/* Breakdown */}
                    <div className="mt-2.5 space-y-1.5 text-[12px] leading-[17px]">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#2563EB] dark:text-[#38BDF8]">
                          <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                          {language === "hi" ? "निर्मित कार्य:" : "Created Tasks:"}
                        </span>
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {b.created}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#16A34A] dark:text-[#34D399]">
                          <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                          {language === "hi" ? "पूर्ण किए गए:" : "Completed:"}
                        </span>
                        <span className="font-semibold text-[#0F172A] dark:text-white">
                          {b.completed}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[#DC2626] dark:text-[#F87171]">
                          <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
                          {language === "hi" ? "अतिदेय (Overdue):" : "Overdue:"}
                        </span>
                        <span className="font-semibold text-[#DC2626]">
                          {b.overdue}
                        </span>
                      </div>

                      <div className="pt-1.5 mt-1 border-t border-[#F1F5F9] dark:border-[#163854] flex items-center justify-between text-[#2563EB]">
                        <span className="flex items-center gap-1.5 font-medium">
                          <span className="h-[2px] w-3 rounded-full bg-[#2563EB]" />
                          {language === "hi" ? "वितरण दक्षता:" : "Delivery Efficiency:"}
                        </span>
                        <span className="font-bold text-[12px]">
                          {b.efficiency}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
