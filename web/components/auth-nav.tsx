"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";

export function AuthNav() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("tma_token");
    setToken(t);
  }, []);

  const logout = () => {
    localStorage.removeItem("tma_token");
    setToken(null);
  };

  const { t } = useI18n();

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="hover:underline text-sm">{t("auth.login")}</Link>
        <Link href="/signup" className="btn text-xs px-3 py-1">{t("auth.signup")}</Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <Link href="/developers" className="hover:underline text-sm">{t("auth.myProjects")}</Link>
      <button className="btn text-xs px-3 py-1" onClick={logout}>{t("auth.logout")}</button>
    </div>
  );
}
