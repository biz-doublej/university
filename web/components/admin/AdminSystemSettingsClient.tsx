"use client";

import { useState } from "react";

type Props = {
  university: string;
};

export default function AdminSystemSettingsClient({ university }: Props) {
  const [seedResult, setSeedResult] = useState<any>(null);
  const [clearResult, setClearResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const withHandler = async (action: "seed" | "clear") => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = action === "seed" ? "/api/dev/seed" : "/api/dev/clear-assignments";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "요청을 처리하지 못했습니다.");
      }
      if (action === "seed") setSeedResult(data);
      else setClearResult(data);
    } catch (err: any) {
      setError(err?.message || "시스템 설정 작업 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const tokenSet = Boolean(process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_TENANT_ID);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 시스템 설정</h1>
        <p className="mt-3 text-sm text-white/70">
          테넌트 운영에 필요한 초기 데이터를 세팅하고, 배포 환경 변수를 점검합니다. Dev/Stage에서
         만 사용하세요.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">인프라 작업</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn rounded-full px-5 py-2 text-sm"
            onClick={() => withHandler("seed")}
            disabled={loading}
          >
            {loading ? "실행 중..." : "기본 데이터 시드"}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
            onClick={() => withHandler("clear")}
            disabled={loading}
          >
            자동 배정 초기화
          </button>
        </div>
        {seedResult && (
          <div className="mt-3 text-xs text-white/60">시드 결과: {JSON.stringify(seedResult)}</div>
        )}
        {clearResult && (
          <div className="mt-1 text-xs text-white/60">초기화 결과: {JSON.stringify(clearResult)}</div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">환경 변수 체크</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li>• NEXT_PUBLIC_API_BASE 설정: {process.env.NEXT_PUBLIC_API_BASE ?? "(미설정)"}</li>
          <li>• NEXT_PUBLIC_TENANT_ID 설정: {process.env.NEXT_PUBLIC_TENANT_ID ?? "(미설정)"}</li>
          <li>• TIMETABLE_SESSION_TOKEN: {process.env.TIMETABLE_SESSION_TOKEN ? "✓" : "(서버 .env 설정 필요)"}</li>
          <li>• ADMIN_TOKEN: {process.env.ADMIN_TOKEN ? "✓" : "(서버 .env 설정 필요)"}</li>
        </ul>
        {!tokenSet && (
          <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            API Base 또는 Tenant ID가 설정되지 않았습니다. 배포 전에 환경 변수를 확인하세요.
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
