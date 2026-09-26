"use client";

export default function DashboardSkeleton() {
  return (
    <div className="min-h-[calc(100vh-74px)] bg-[#F5F9FC] dark:bg-[#071926] px-4 sm:px-8 py-6 sm:py-7">
      <div className="animate-pulse space-y-6">
        {/* Welcome Hero Skeleton */}
        <div className="h-[116px] rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E]" />

        {/* 5 KPI Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 sm:gap-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-[128px] rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E]"
            />
          ))}
        </div>

        {/* Analytics Row Skeleton (7 / 5) */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
          <div className="h-80 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-7" />
          <div className="h-80 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-5" />
        </div>

        {/* Lower Row 1 Skeleton: Employee Performance + Calendar */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
          <div className="h-96 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-7 xl:col-span-8" />
          <div className="h-96 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-5 xl:col-span-4" />
        </div>

        {/* Lower Row 2 Skeleton: Quick Actions + Tasks */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
          <div className="h-96 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-5 xl:col-span-4" />
          <div className="h-96 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E] lg:col-span-7 xl:col-span-8" />
        </div>

        {/* Overdue Alert Skeleton */}
        <div className="h-20 rounded-[14px] bg-slate-200/70 border border-[#E2E8F0] dark:bg-[#0B2538] dark:border-[#1E435E]" />
      </div>
    </div>
  );
}
