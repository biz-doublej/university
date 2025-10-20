"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import ScheduleGrid from "./ScheduleGrid";
import type { EnrollmentItem, TimetableRow } from "./types";

type Props = {
  university: string;
};

export default function StudentScheduleClient({ university }: Props) {
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCourses: 6 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI 시간표를 불러오지 못했습니다.");
      }
      setTimetable(data?.timetable || []);
      setStats(data?.stats || null);
    } catch (err: any) {
      setError(err?.message || "시간표 조회 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      const res = await fetch("/api/student/enrollments");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "수강신청 목록을 불러오지 못했습니다.");
      }
      setEnrollments(data || []);
    } catch (err: any) {
      setError((prev) => prev ?? err?.message ?? "");
    }
  }, []);

  useEffect(() => {
    loadTimetable();
    loadEnrollments();
  }, [loadTimetable, loadEnrollments]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{university} 주간 시간표</h1>
            <p className="mt-2 text-sm text-white/70">
              AI 추천과 실제 수강신청 내역을 결합하여 월~금 1~9교시 기준 개인 시간표를
              구성했습니다. 관리자가 AI 자동 배정을 실행하면 여기에서도 즉시 반영됩니다.
            </p>
          </div>
          <button
            type="button"
            className="btn rounded-full px-5 py-2 text-sm"
            onClick={loadTimetable}
            disabled={loading}
          >
            {loading ? "업데이트 중..." : "시간표 새로고침"}
          </button>
        </div>
        {stats && (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/75">
              <div className="text-xs uppercase tracking-widest text-white/50">추천 과목</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {stats.selected_courses ?? 0} / {stats.max_courses ?? 6}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/75">
              <div className="text-xs uppercase tracking-widest text-white/50">AI 배정 진행률</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {stats.assigned_courses ?? 0} / {stats.total_courses ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/75">
              <div className="text-xs uppercase tracking-widest text-white/50">규칙</div>
              <div className="mt-1 text-sm">
                월~금 / 1-9교시 / 교시당 60분
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <ScheduleGrid rows={timetable} heading="AI 기반 주간 시간표" />

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">내 수강신청 과목</h2>
        <div className="mt-4 space-y-3">
          {enrollments.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              아직 수강신청한 과목이 없습니다. AI 추천 화면에서 과목을 선택해 보세요.
            </div>
          ) : (
            enrollments.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
              >
                <div>
                  <div className="font-semibold text-white">
                    {[item.course_code, item.course_name].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-xs text-white/50">상태 {item.status}</div>
                </div>
                <div className="text-xs text-white/50">신청일 {new Date(item.created_at).toLocaleString("ko-KR")}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
