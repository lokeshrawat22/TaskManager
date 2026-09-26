"use client";
import { useLanguage } from "@/context/LanguageContext";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<
  ThemeContextType | undefined
>(undefined);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {

  const [theme, setThemeState] =
    useState<Theme>("light");

  const [mounted, setMounted] = useState(false);

  // =====================================================
  // INITIALIZE THEME
  // =====================================================

  useEffect(() => {
    try {
      const savedTheme =
        localStorage.getItem("theme");

      const initialTheme: Theme =
        savedTheme === "dark"
          ? "dark"
          : "light";

      setThemeState(initialTheme);

      document.documentElement.classList.toggle(
        "dark",
        initialTheme === "dark"
      );

      document.documentElement.classList.toggle(
        "light",
        initialTheme === "light"
      );
    } catch {
      // Fallback to light theme
      setThemeState("light");

      document.documentElement.classList.remove(
        "dark"
      );

      document.documentElement.classList.add(
        "light"
      );
    }

    setMounted(true);
  }, []);

  // =====================================================
  // SET THEME
  // =====================================================

  const setTheme = (newTheme: Theme) => {

    setThemeState(newTheme);

    try {
      localStorage.setItem(
        "theme",
        newTheme
      );
    } catch {
      // Ignore localStorage errors
    }

    document.documentElement.classList.toggle(
      "dark",
      newTheme === "dark"
    );

    document.documentElement.classList.toggle(
      "light",
      newTheme === "light"
    );
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// =====================================================
// USE THEME
// =====================================================

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}