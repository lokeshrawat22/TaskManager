"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

// =====================================================
// GLOBAL SCROLL LOCK MANAGER
// Supports nested modals without premature unlock
// =====================================================

let activeModalCount = 0;
let originalOverflow = "";
let originalPaddingRight = "";

function lockScroll() {
  if (typeof document === "undefined") return;
  if (activeModalCount === 0) {
    originalOverflow = document.body.style.overflow;
    originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  activeModalCount++;
}

function unlockScroll() {
  if (typeof document === "undefined") return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = originalOverflow || "";
    document.body.style.paddingRight = originalPaddingRight || "";
  }
}

// =====================================================
// MODAL PROPS
// =====================================================

export interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  closeOnEsc?: boolean;
  closeOnClickOutside?: boolean;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  zIndexBackdrop?: number;
  zIndexContent?: number;
}

// =====================================================
// GLOBAL MODAL COMPONENT (PORTAL + BACKDROP BLUR)
// Mounts to document.body above Sidebar (z-50) and Header (z-40)
// =====================================================

export function Modal({
  isOpen,
  onClose,
  children,
  closeOnEsc = true,
  closeOnClickOutside = true,
  className = "",
  style,
  ariaLabel,
  ariaDescribedBy,
  zIndexBackdrop = 1000,
  zIndexContent = 1010,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [cachedChildren, setCachedChildren] = useState<React.ReactNode>(children);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [isLockedShake, setIsLockedShake] = useState(false);
  const shakeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side mount detection for Next.js SSR
  useEffect(() => {
    setMounted(true);
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, []);

  const handleBackdropClick = () => {
    if (closeOnClickOutside && onClose) {
      onClose();
    } else if (!closeOnClickOutside) {
      setIsLockedShake(true);
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = setTimeout(() => {
        setIsLockedShake(false);
      }, 350);
    }
  };

  // Preserve cached children while active or transitioning out
  useEffect(() => {
    if (children) {
      setCachedChildren(children);
    }
  }, [children]);

  // Handle enter and exit animation lifecycle
  useEffect(() => {
    if (isOpen) {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      setIsRendered(true);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setIsVisible(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    } else {
      setIsVisible(false);
      // Wait for exit transition (200ms) before unmounting from DOM
      exitTimerRef.current = setTimeout(() => {
        setIsRendered(false);
        exitTimerRef.current = null;
      }, 200);

      return () => {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
        }
      };
    }
  }, [isOpen]);

  // Scroll lock management
  useEffect(() => {
    if (!isOpen || !mounted) return;

    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isOpen, mounted]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEsc || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!mounted || !isRendered) return null;

  return createPortal(
    <div
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: zIndexBackdrop }}
      role="presentation"
    >
      {/* =====================================================
          GLOBAL VIEWPORT BACKDROP (BLUR + DIM)
          Smooth fade in (opacity: 0 -> 1) / fade out (opacity: 1 -> 0)
      ===================================================== */}
      <div
        className={`fixed inset-0 transition-opacity duration-200 ${
          isVisible ? "opacity-100 ease-out" : "opacity-0 ease-in"
        }`}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: zIndexBackdrop,
          backgroundColor: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* =====================================================
          MODAL CONTENT CONTAINER (SHARP + INTERACTIVE)
          Smooth scale 0.96 -> 1 & opacity 0 -> 1 on enter
          Smooth scale 1 -> 0.96 & opacity 1 -> 0 on exit
      ===================================================== */}
      <div
        className="fixed inset-0 overflow-y-auto"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: zIndexContent,
          pointerEvents: "none",
        }}
      >
        <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
          <div
            ref={modalContentRef}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            className={`pointer-events-auto max-w-[calc(100vw-24px)] transition-all duration-200 transform-gpu ${
              isLockedShake ? "animate-modal-shake" : ""
            } ${
              isVisible
                ? "opacity-100 scale-100 translate-y-0 ease-out"
                : "opacity-0 scale-[0.96] translate-y-1 ease-in"
            } ${className}`}
            style={style}
            onClick={(e) => e.stopPropagation()}
          >
            {children || cachedChildren}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;

