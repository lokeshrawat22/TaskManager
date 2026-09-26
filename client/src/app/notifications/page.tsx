"use client";

import DashboardLayout from "@/app/dashboard/layout";
import NotificationsPageView from "@/components/NotificationsPageView";

export default function NotificationsPage() {
  return (
    <DashboardLayout>
      <NotificationsPageView role="employee" />
    </DashboardLayout>
  );
}