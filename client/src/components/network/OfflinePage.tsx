"use client";

import { AlertCircle, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/context/NetworkContext";

export default function OfflinePage() {
  const { isChecking, lastChecked, offlineMessage, checkConnection } =
    useNetworkStatus();
  const [timeAgo, setTimeAgo] = useState("Just now");

  // Format relative timestamp
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!lastChecked) {
        setTimeAgo("Just now");
        return;
      }
      const diffSeconds = Math.floor(
        (new Date().getTime() - lastChecked.getTime()) / 1000
      );
      if (diffSeconds < 10) {
        setTimeAgo("Just now");
      } else if (diffSeconds < 60) {
        setTimeAgo(`${diffSeconds}s ago`);
      } else {
        const mins = Math.floor(diffSeconds / 60);
        setTimeAgo(`${mins}m ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 5000);
    return () => clearInterval(interval);
  }, [lastChecked]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-[#F5F9FC] p-4 sm:p-6 dark:bg-[#071926] animate-in fade-in duration-200"
    >
      {/* Centered Enterprise Card */}
      <div className="w-full max-w-md rounded-2xl border border-[#D8E4EC] bg-white p-7 sm:p-9 text-center shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-[#1E435E] dark:bg-[#0B2538] transition-all">
        
        {/* Status indicator badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FCA5A5]/40 bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#DC2626] dark:border-[#991B1B]/40 dark:bg-[#450A0A]/40 dark:text-[#F87171]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#EF4444] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#EF4444]" />
            </span>
            Offline
          </span>
        </div>

        {/* Network / WifiOff Icon */}
        <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F0F7FA] text-[#087EA4] shadow-xs dark:bg-[#12364E] dark:text-[#22D3EE]">
          <WifiOff size={30} strokeWidth={2.2} />
        </div>

        {/* Semantic Heading */}
        <h1 className="mt-5 text-[22px] sm:text-[24px] font-bold tracking-tight text-[#0B2942] dark:text-white">
          No Internet Connection
        </h1>

        {/* Context Description */}
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#6B8195] dark:text-[#8CB0C7]">
          Your connection appears to be offline.
          <br className="hidden sm:inline" /> Check your network connection and
          try again.
        </p>

        {/* Feedback Alert when Still Offline */}
        {offlineMessage && (
          <div
            role="status"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-[#FCA5A5]/50 bg-[#FEF2F2] px-3.5 py-2.5 text-xs font-semibold text-[#DC2626] dark:border-[#991B1B]/50 dark:bg-[#450A0A]/50 dark:text-[#FCA5A5] animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>{offlineMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => checkConnection()}
            disabled={isChecking}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-5 py-3 text-[13.5px] font-semibold text-white shadow-xs transition hover:bg-[#0073E6] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#0084FF]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer dark:focus:ring-offset-[#0B2538]"
          >
            {isChecking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Checking connection...</span>
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                <span>Try Again</span>
              </>
            )}
          </button>
        </div>

        {/* Last Checked Meta Footer */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11.5px] text-[#8EA3AC] dark:text-[#718E9A]">
          <span>Last checked:</span>
          <span className="font-medium text-[#6B8195] dark:text-[#94A3B8]">
            {timeAgo}
          </span>
        </div>

        {/* Subtle Brand Tag */}
        <div className="mt-6 border-t border-[#EDF2F7] pt-3.5 text-[11px] text-[#A0B3BF] dark:border-[#1A3D54] dark:text-[#5B7888]">
          MindMatrix Workforce Control Center
        </div>
      </div>
    </div>
  );
}
