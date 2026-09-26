/**
 * /admin/integrations — Redirects to Admin Dashboard.
 *
 * The Integrations module was removed. Any bookmarked or direct visits to
 * this route are redirected cleanly to /admin/dashboard.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function IntegrationsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  // Render nothing — the redirect fires immediately.
  return null;
}
