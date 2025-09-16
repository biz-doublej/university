"use client";

import React from "react";
import { useI18n } from "./i18n";

export function SiteNav() {
  const { t } = useI18n();
  return (
    <nav className="text-sm space-x-4">
      <a href="/" className="hover:underline">{t("nav.home")}</a>
      <a href="/import" className="hover:underline">{t("nav.import")}</a>
      <a href="/scheduler" className="hover:underline">{t("nav.scheduler")}</a>
      <a href="/dataset" className="hover:underline">{t("nav.dataset")}</a>
      <a href="/developers" className="hover:underline">{t("nav.developers")}</a>
    </nav>
  );
}

