"use client";

import { useEffect, useMemo, useState } from "react";

import ScheduleGrid from "./ScheduleGrid";
import type { EnrollmentItem, TimetableRow } from "./types";

type Props = {
  university: string;
};

type InsightCard = {
  title: string;
  value: string;
  hint?: string;
};

export default function StudentInsightsClient({ university }: Props) {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [enrollRes, timetableRes] = await Promise.all([
          fetch("/api/student/enrollments"),
          fetch("/api/student/timetable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ maxCourses: 6 }),
          }),
        ]);
        const enrollData = await enrollRes.json();
        const timetableData = await timetableRes.json();
        if (!enrollRes.ok) {
          throw new Error(enrollData?.error || "수강신청 정보를 불러오지 못했습니다.");
        }
        if (!timetableRes.ok) {
          throw new Error(timetableData?.error || "AI 시간표를 불러오지 못했습니다.");
        }
        setEnrollments(enrollData || []);
        setTimetable(timetableData?.timetable || []);
        setStats(timetableData?.stats || null);
      } catch (err: any) {
        setError(err?.message || "인사이트 데이터를 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const activeEnrollments = useMemo(
    () => enrollments.filter((item) => item.status !== "dropped"),
    [enrollments],
  );

  const weeklyHours = useMemo(() => {
    const seen = new Set<string>();
    let hours = 0;
    for (const row of timetable) {
      for (const slot of row.slots) {
        const key = `${slot.day}-${slot.period}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hours += 1;
      }
    }
    return hours;
  }, [timetable]);

  const aiFilters = stats?.applied_filters ?? {};

  const cards: InsightCard[] = [
    {
      title: "활성 과목 수",
      value: `${activeEnrollments.length} 과목`,
      hint: `전체 신청 ${enrollments.length}건 중 활성 ${activeEnrollments.length}건` ,
    },
    {
      title: "주당 수업 시간",
      value: `${weeklyHours} 시간`,
      hint: "월~금, 1교시(09:00)~9교시(18:00) 기준",
    },
    {
      title: "AI 적용 규칙",
      value: "월~금 / 1-9교시 / 교시당 60분",
      hint: aiFilters.avoid_days?.length
        ? `회피 요일: ${aiFilters.avoid_days.join(", ")}`
        : undefined,
    },
  ];

  const progress = useMemo(() => {
    const target = stats?.max_courses ?? 6;
    const ratio = target ? Math.min(1, timetable.length / target) : 0;
    return Math.round(ratio * 100);
  }, [stats, timetable.length]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
        <h1 className="text-3xl font-semibold text-white">{university} 학습 인사이트</h1>
        <p className="mt-3 text-sm text-white/70">
          수강신청, AI 추천 시간표, 과목 메타데이터를 분석해 학습 진행 상황과 우선순위를
          한눈에 보여줍니다. 졸업 요건 추적과 학습 코칭 리포트를 통해 다음 학기 계획을
          쉽게 세울 수 있습니다.
        </p>
        {loading && (
          <div className="mt-3 text-sm text-white/60">데이터를 불러오는 중...</div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg"
          >
            <div className="text-xs uppercase tracking-widest text-white/50">
              {card.title}
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">{card.value}</div>
            {card.hint && <div className="mt-2 text-xs text-white/50">{card.hint}</div>}
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">AI 학습 코칭</h2>
        <div className="mt-3 text-sm text-white/70">
          AI 는 현재 추천된 {timetable.length}개 과목 기반으로 이수 경로를 계산했습니다.
          목표 과목 수 대비 {progress}%를 확보했으며, 남은 슬롯에 대해 선호 과목을 추가하면
          더욱 정밀한 추천을 받을 수 있습니다.
        </div>
        <div className="mt-6 h-3 w-full rounded-full bg-white/10">
          <div
            className="h-3 rounded-full bg-emerald-400"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      <ScheduleGrid rows={timetable} heading="AI 추천 시간표" />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">수강신청 내역</h2>
        <div className="mt-4 space-y-3">
          {enrollments.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
              아직 수강신청 내역이 없습니다.
            </div>
          ) : (
            enrollments.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
              >
                <div>
                  <div className="font-semibold text-white">
                    {[item.course_code, item.course_name].filter(Boolean).join(" · ")}
                  </div>
                  <div className="text-xs text-white/50">상태 {item.status}</div>
                </div>
                <div className="text-xs text-white/50">
                  {new Date(item.created_at).toLocaleString("ko-KR")}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
