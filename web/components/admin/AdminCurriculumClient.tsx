"use client";

import { useCallback, useEffect, useState } from "react";

type Summary = {
  courses: number;
  students: number;
  enrollments: number;
  reviews: number;
  ai_portal_enabled: boolean;
};

type FixedSummary = {
  courses: number;
  students?: number;
  enrollments?: number;
  reviews?: number;
};

type OptimizeStatus = {
  job_id: string;
  status: string;
  score?: number | null;
  explain?: string | null;
};

type Props = {
  university: string;
};

export default function AdminCurriculumClient({ university }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [status, setStatus] = useState<OptimizeStatus | null>(null);
  const [fixedSummary, setFixedSummary] = useState<FixedSummary | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/summary");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "테넌트 요약 정보를 가져오지 못했습니다.");
      }
      setSummary(data as Summary);
      setFixedSummary(null);
    } catch (err: any) {
      try {
        const fallback = await fetch("/api/admin/fixed-summary");
        const fallbackData = await fallback.json();
        if (fallback.ok) {
          setFixedSummary({
            courses: fallbackData?.courses ?? 0,
            students: fallbackData?.students ?? 0,
            enrollments: fallbackData?.enrollments ?? 0,
            reviews: fallbackData?.reviews ?? 0,
          });
          setSummary(null);
          setError(null);
          return;
        }
      } catch {
        // ignore
      }
      setError(err?.message || "요약 정보를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!status || !status.job_id) return;
    if (status.status === "completed" || status.status === "failed" || status.status === "not_found") {
      setOptimizing(false);
      void loadSummary();
      return;
    }
    const timer = setInterval(async () => {
      const res = await fetch(`/api/admin/optimize/${status.job_id}`);
      const data = await res.json();
      if (res.ok) {
        setStatus(data as OptimizeStatus);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [status]);

  const runOptimize = async () => {
    setOptimizing(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_version: 1, week: "2025-01", solver: "greedy" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI 배정을 시작하지 못했습니다.");
      }
      setStatus(data as OptimizeStatus);
    } catch (err: any) {
      setError(err?.message || "AI 배정 실행 중 오류가 발생했습니다.");
      setOptimizing(false);
    }
  };

  const scoreboard: Summary = summary ??
    {
      courses: fixedSummary?.courses ?? 0,
      students: fixedSummary?.students ?? 0,
      enrollments: fixedSummary?.enrollments ?? 0,
      reviews: fixedSummary?.reviews ?? 0,
      ai_portal_enabled: true,
    };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 학사 편성 현황</h1>
        <p className="mt-3 text-sm text-white/70">
          개설 과목, 학생, 수강신청, 후기 데이터를 한눈에 확인하고 AI 시간표 배정을 즉시 실행할
          수 있습니다. 정책 버전과 학사 주차를 입력하면 자동으로 배정 작업이 시작됩니다.
        </p>
        {loadingSummary && <div className="mt-3 text-sm text-white/60">요약 데이터를 불러오는 중...</div>}
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <MetricCard title="개설 과목" value={scoreboard.courses.toLocaleString()} />
          <MetricCard title="등록 학생" value={scoreboard.students.toLocaleString()} />
          <MetricCard title="수강신청" value={scoreboard.enrollments.toLocaleString()} />
          <MetricCard title="수업 후기" value={scoreboard.reviews.toLocaleString()} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">AI 기반 시간표 배정</h2>
            <p className="mt-1 text-sm text-white/60">
              Greedy 워밍업 알고리즘으로 빠르게 배정한 뒤, OR-Tools 또는 PuLP로 확장 가능합니다.
            </p>
          </div>
          <button
            type="button"
            className="btn rounded-full px-5 py-2 text-sm"
            onClick={runOptimize}
            disabled={optimizing}
          >
            {optimizing ? "AI 배정 실행 중..." : "AI 배정 실행"}
          </button>
        </div>
        {/* Optimization status panel intentionally suppressed for a cleaner UI */}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-lg">
      <div className="text-xs uppercase tracking-widest text-white/50">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
