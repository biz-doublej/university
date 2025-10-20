"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
};

type Props = {
  university: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function DeveloperPlatformStatusClient({ university }: Props) {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  const ping = async () => {
    setError(null);
    const start = performance.now();
    try {
      const res = await fetch(`${API_BASE}/healthz`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Healthz 실패");
      }
      setHealth(data as Health);
      setLatency(performance.now() - start);
    } catch (err: any) {
      setError(err?.message || "플랫폼 상태 확인 실패");
    }
  };

  useEffect(() => {
    ping();
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 플랫폼 상태</h1>
        <p className="mt-3 text-sm text-white/70">
          API 응답 속도, 헬스체크 상태를 실시간으로 확인하고, 필요 시 AI 배정 상태를 재확인하세요.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">헬스 체크</h2>
          <button
            type="button"
            onClick={ping}
            className="btn rounded-full px-5 py-2 text-sm"
          >
            다시 측정
          </button>
        </div>
        <div className="mt-4 text-sm text-white/70">
          API Base: <code className="text-white/90">{API_BASE}</code>
        </div>
        {health && (
          <div className="mt-3 text-white/80">
            상태: {health.status} {latency !== null ? `· ${latency.toFixed(1)}ms` : ""}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
