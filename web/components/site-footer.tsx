"use client";

import React from "react";
import { useI18n } from "./i18n";

export function SiteFooter() {
  const { lang, setLang, t } = useI18n();
  return (
    <footer className="border-t border-white/10 mt-10">
      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="text-sm text-white/70">{t("footer.companyInfo")}</div>
        <div className="flex items-center gap-2 text-sm">
          <span>{t("footer.language")}:</span>
          <select className="input !w-auto px-2 py-1" value={lang} onChange={(e) => setLang(e.target.value as any)}>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
        </div>
      </div>
    </footer>
  );
}

