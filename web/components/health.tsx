"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export function Health() {
  const [status, setStatus] = useState<string>("확인 중…");
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

  if (error) return <div className="text-red-300">에러: {error}</div>;
  return <div className="text-green-300">상태: {status}</div>;
}

