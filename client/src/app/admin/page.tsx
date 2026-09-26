"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function AdminDashboard() {
    const { t } = useLanguage();



  return (
    <div>
      <h1>
        {t("dashboard_text")}
      </h1>
      <p>
        {t("organizationManagement")}
      </p>
    </div>
  );
}