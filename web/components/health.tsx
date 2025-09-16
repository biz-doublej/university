"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useI18n } from "./i18n";

export function Health() {
  const { t } = useI18n();
  const [status, setStatus] = useState<string>(t("health.checking"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/healthz")
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        const json = await res.json();
        setStatus(json.status ?? "ok");
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="text-red-300">{t("health.error")}: {error}</div>;
  return <div className="text-green-300">{t("health.status")}: {status}</div>;
}
