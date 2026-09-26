"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { en } from "../locales/en";
import { hi } from "../locales/hi";

type Language = "en" | "hi";

type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, ...args: any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const dictionaries = {
  en,
  hi,
};

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {

  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Update cookie whenever language changes
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Set cookie that expires in 1 year
    document.cookie = `NEXT_LOCALE=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    // Also save in localStorage as fallback
    try {
      localStorage.setItem("NEXT_LOCALE", lang);
    } catch {}
  }, []);

  const cleanString = (str: string): string => {
    return str
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  };

  const t = useCallback(
    (key: string, ...args: any[]) => {
      if (!key) return "";

      const getFromDict = (dict: any): any => {
        if (!dict) return undefined;
        // 1. Direct flat key
        if (dict[key] !== undefined && dict[key] !== null) {
          return dict[key];
        }
        // 2. Nested dot notation
        if (key.includes(".")) {
          const parts = key.split(".");
          let current = dict;
          for (const p of parts) {
            if (current === undefined || current === null) break;
            current = current[p];
          }
          if (current !== undefined && current !== null) {
            return current;
          }
          // 3. Fallback to last segment (e.g. "dashboard.pendingTasks" -> "pendingTasks")
          const lastPart = parts[parts.length - 1];
          if (dict[lastPart] !== undefined && dict[lastPart] !== null) {
            return dict[lastPart];
          }
        }
        return undefined;
      };

      let value = getFromDict(dictionaries[language]);

      // Fallback to English if missing in selected language
      if (value === undefined || value === null) {
        value = getFromDict(dictionaries["en"]);
      }

      if (typeof value === "function") {
        const result = value(...args);
        return typeof result === "string" ? cleanString(result) : result;
      }

      if (typeof value === "string") {
        let result = value;
        if (args.length > 0 && typeof args[0] === "object" && args[0] !== null) {
          const params = args[0];
          result = result.replace(/\{\{\s*(\w+)\s*\}\}|\{\s*(\w+)\s*\}/g, (match, p1, p2) => {
            const paramKey = p1 || p2;
            return params[paramKey] !== undefined ? String(params[paramKey]) : match;
          });
        }
        return cleanString(result);
      }

      // If key is formatted like "dashboard.pendingTasks", format readable fallback
      if (key.includes(".")) {
        const lastPart = key.split(".").pop() || key;
        // Convert camelCase to Title Case
        const formatted = lastPart.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
        return cleanString(formatted);
      }

      return cleanString(key);
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}