import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NetworkProvider } from "@/context/NetworkContext";
import { NotificationProvider } from "@/context/NotificationContext";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindMatrix",
  description: "MindMatrix Workforce Management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const initialLang = (localeCookie === "hi" ? "hi" : "en") as "en" | "hi";

  return (
    <html
      lang={initialLang}
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-xl focus:bg-[#087D8F] focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#087D8F]"
        >
          Skip to main content
        </a>
        <LanguageProvider initialLanguage={initialLang}>
          <ThemeProvider>
            <AccessibilityProvider>
              <NetworkProvider>
                <AuthProvider>
                  <NotificationProvider>
                    {children}
                  </NotificationProvider>
                </AuthProvider>
              </NetworkProvider>
            </AccessibilityProvider>
          </ThemeProvider>
        </LanguageProvider>

        <Toaster
          position="top-center"
          duration={4000}
          gap={8}
          visibleToasts={3}
          toastOptions={{
            unstyled: true,
            className: "flex justify-center items-center w-full",
          }}
        />
      </body>
    </html>
  );
}