"use client";

import Link from "next/link";
import { Health } from "../components/health";
import { useI18n } from "../components/i18n";

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold">{t("home.title")}</h1>
        <p className="text-sm text-white/70 mt-2">{t("home.desc")}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="font-medium">{t("home.health")}</div>
          <Health />
        </div>

        <div className="card space-y-3">
          <div className="font-medium">{t("home.dataImport")}</div>
          <p className="text-sm text-white/70">{t("home.dataImportDesc")}</p>
          <Link className="btn w-fit" href="/import">{t("home.goToImport")}</Link>
        </div>
      </div>
    </div>
  );
}
