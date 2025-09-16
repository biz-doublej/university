"use client";

import React from "react";
import { useI18n } from "./i18n";

export function BrandTagline() {
  const { t } = useI18n();
  return <div className="text-[12px] text-white/70 mt-0.5">{t("layout.tagline")}</div>;
}

