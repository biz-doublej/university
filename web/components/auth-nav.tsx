"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import { AuthUser, clearSession, getDashboardRoute, getStoredUser } from "../lib/session";

export function AuthNav() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSessionChange = () => setUser(getStoredUser());
    handleSessionChange();
    window.addEventListener("storage", handleSessionChange);
    window.addEventListener("tma:session", handleSessionChange);
    return () => {
      window.removeEventListener("storage", handleSessionChange);
      window.removeEventListener("tma:session", handleSessionChange);
    };
  }, []);

  const logout = () => {
    clearSession();
    setUser(null);
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="hover:underline text-sm">{t("auth.login")}</Link>
        <Link href="/signup" className="btn text-xs px-3 py-1">{t("auth.signup")}</Link>
      </div>
    );
  }

  const dashboardHref = getDashboardRoute(user.role);
  return (
    <div className="flex items-center gap-3">
      <Link href={dashboardHref} className="hover:underline text-sm">{t("auth.dashboard")}</Link>
      <button className="btn text-xs px-3 py-1" onClick={logout}>{t("auth.logout")}</button>
    </div>
  );
}
