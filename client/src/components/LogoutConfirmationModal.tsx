"use client";

import React, { useEffect, useRef } from "react";
import { LogOut, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useLanguage } from "@/context/LanguageContext";

export interface LogoutConfirmationModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function LogoutConfirmationModal({
  isOpen,
  isLoading = false,
  onClose,
  onConfirm,
}: LogoutConfirmationModalProps) {
  const { t } = useLanguage();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management: move focus into dialog on open for accessibility
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      className="w-full max-w-md"
      ariaLabel="Confirm Logout"
      ariaDescribedBy="logout-confirm-description"
    >
      <div
        className="w-full overflow-hidden rounded-2xl border border-[#D9E4EC] bg-white shadow-2xl transition-all dark:border-[#1E435E] dark:bg-[#0B2538]"
        role="document"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E2E8F0] p-5 dark:border-[#1E435E]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#DC2626] dark:bg-red-950/40 dark:text-red-400">
              <LogOut size={20} />
            </div>
            <div>
              <h2
                id="logout-confirm-title"
                className="text-base font-bold text-[#123B5D] dark:text-white"
              >
                {t("confirmLogout") || "Confirm Logout"}
              </h2>
              <p
                id="logout-confirm-description"
                className="mt-0.5 text-xs text-[#64748B] dark:text-[#8CB0C7]"
              >
                {t("confirmLogoutMessage") ||
                  "Are you sure you want to log out of your account?"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#123B5D] dark:text-[#8CB0C7] dark:hover:bg-[#1E435E] dark:hover:text-white disabled:opacity-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 bg-[#F8FAFC] p-4 dark:bg-[#071F2C]/50">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-[#D9E4EC] bg-white px-4 py-2 text-xs font-semibold text-[#123B5D] transition hover:bg-[#EEF5F9] dark:border-[#1E435E] dark:bg-[#071F2C] dark:text-white cursor-pointer disabled:opacity-50"
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#B91C1C] cursor-pointer shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>
              {isLoading
                ? t("common.loggingOut") || "Logging out..."
                : t("common.logout") || "Log out"}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default LogoutConfirmationModal;
