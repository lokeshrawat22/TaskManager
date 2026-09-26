"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

export type FontSize = "small" | "default" | "large" | "extra-large";
export type DisplayScale = "90" | "100" | "110" | "125";

export interface AccessibilitySettings {
  fontSize: FontSize;
  displayScale: DisplayScale;
  highContrast: boolean;
  reduceMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: "default",
  displayScale: "100",
  highContrast: false,
  reduceMotion: false,
};

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  activeRole: "admin" | "employee";
  setFontSize: (size: FontSize) => void;
  setDisplayScale: (scale: DisplayScale) => void;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetToDefaults: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
);

const getStorageKey = (role: "admin" | "employee") => {
  return role === "admin"
    ? "mindmatrix-admin-accessibility"
    : "mindmatrix-employee-accessibility";
};

const loadSavedSettings = (role: "admin" | "employee"): AccessibilitySettings => {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_SETTINGS;
  try {
    const raw = localStorage.getItem(getStorageKey(role));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fontSize: ["small", "default", "large", "extra-large"].includes(
          parsed.fontSize
        )
          ? parsed.fontSize
          : "default",
        displayScale: ["90", "100", "110", "125"].includes(parsed.displayScale)
          ? parsed.displayScale
          : "100",
        highContrast: Boolean(parsed.highContrast),
        reduceMotion: Boolean(parsed.reduceMotion),
      };
    }
  } catch (err) {
    console.error("Failed to read accessibility settings from localStorage:", err);
  }
  return DEFAULT_ACCESSIBILITY_SETTINGS;
};

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith("/admin") ?? false;
  const currentRole: "admin" | "employee" = isAdminPath ? "admin" : "employee";

  const [settings, setSettings] = useState<AccessibilitySettings>(() =>
    loadSavedSettings(currentRole)
  );

  // Apply visual settings to document element and body
  const applySettingsToDOM = useCallback((s: AccessibilitySettings) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // 1. Font Size Attribute
    root.setAttribute("data-font-size", s.fontSize);

    // 2. Display Scale Attribute & Body zoom
    root.setAttribute("data-display-scale", s.displayScale);
    const scaleMap: Record<DisplayScale, string> = {
      "90": "0.9",
      "100": "1",
      "110": "1.1",
      "125": "1.25",
    };
    if (document.body) {
      // @ts-ignore - zoom is standard CSS property in modern browsers
      document.body.style.zoom = scaleMap[s.displayScale] || "1";
    }

    // 3. High Contrast
    root.setAttribute("data-high-contrast", String(s.highContrast));
    root.classList.toggle("high-contrast", s.highContrast);

    // 4. Reduce Motion
    root.setAttribute("data-reduce-motion", String(s.reduceMotion));
    root.classList.toggle("reduce-motion", s.reduceMotion);
  }, []);

  // When role/route context changes, load role-specific settings
  useEffect(() => {
    const loaded = loadSavedSettings(currentRole);
    setSettings(loaded);
    applySettingsToDOM(loaded);
  }, [currentRole, applySettingsToDOM]);

  // Apply on mount and on settings change
  useEffect(() => {
    applySettingsToDOM(settings);
  }, [settings, applySettingsToDOM]);

  // Helper to persist and update settings
  const persistSettings = useCallback(
    (newSettings: AccessibilitySettings) => {
      setSettings(newSettings);
      applySettingsToDOM(newSettings);
      try {
        localStorage.setItem(
          getStorageKey(currentRole),
          JSON.stringify(newSettings)
        );
      } catch (err) {
        console.error("Failed to save accessibility settings to localStorage:", err);
      }
    },
    [currentRole, applySettingsToDOM]
  );

  const setFontSize = useCallback(
    (size: FontSize) => {
      persistSettings({ ...settings, fontSize: size });
    },
    [settings, persistSettings]
  );

  const setDisplayScale = useCallback(
    (scale: DisplayScale) => {
      persistSettings({ ...settings, displayScale: scale });
    },
    [settings, persistSettings]
  );

  const setHighContrast = useCallback(
    (enabled: boolean) => {
      persistSettings({ ...settings, highContrast: enabled });
    },
    [settings, persistSettings]
  );

  const setReduceMotion = useCallback(
    (enabled: boolean) => {
      persistSettings({ ...settings, reduceMotion: enabled });
    },
    [settings, persistSettings]
  );

  const updateSettings = useCallback(
    (partial: Partial<AccessibilitySettings>) => {
      persistSettings({ ...settings, ...partial });
    },
    [settings, persistSettings]
  );

  const resetToDefaults = useCallback(() => {
    persistSettings(DEFAULT_ACCESSIBILITY_SETTINGS);
  }, [persistSettings]);

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        activeRole: currentRole,
        setFontSize,
        setDisplayScale,
        setHighContrast,
        setReduceMotion,
        updateSettings,
        resetToDefaults,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider"
    );
  }
  return context;
}
