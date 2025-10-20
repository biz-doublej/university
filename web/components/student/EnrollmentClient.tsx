"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  EnrollmentItem,
  StudentProfile,
  TimetableRow,
} from "./types";
import ScheduleGrid from "./ScheduleGrid";

const DAYS = [
  { value: "Mon", label: "월" },
  { value: "Tue", label: "화" },
  { value: "Wed", label: "수" },
  { value: "Thu", label: "목" },
  { value: "Fri", label: "금" },
];

const PERIODS = Array.from({ length: 9 }, (_, i) => i + 1);

type Props = {
  university: string;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function courseLabel(course: TimetableRow["course"]) {
  const parts = [course?.code, course?.name].filter(Boolean);
  return parts.join(" · ") || "과목";
}

export default function EnrollmentClient({ university }: Props) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [avoidDays, setAvoidDays] = useState<string[]>([]);
  const [avoidPeriods, setAvoidPeriods] = useState<number[]>([]);
  const [preferredInput, setPreferredInput] = useState<string>("");
  const [maxCourses, setMaxCourses] = useState<number>(4);
  const [submittingCourse, setSubmittingCourse] = useState<number | null>(null);

  const preferredCourses = useMemo(() => {
    return preferredInput
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter(Boolean);
  }, [preferredInput]);

  const activeEnrollmentMap = useMemo(() => {
    const map = new Map<number, EnrollmentItem>();
    for (const item of enrollments) {
      if (item.status !== "dropped") {
        map.set(item.course_id, item);
      }
    }
    return map;
  }, [enrollments]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/student/profile");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "프로필을 불러오지 못했습니다.");
      }
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || "프로필 조회 중 오류가 발생했습니다.");
    }
  }, []);

  const loadEnrollments = useCallback(async () => {
    try {
      const res = await fetch("/api/student/enrollments");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "수강신청 내역을 불러오지 못했습니다.");
      }
      setEnrollments(data || []);
    } catch (err: any) {
      setEnrollError(err?.message || "수강신청 내역 조회 중 오류가 발생했습니다.");
    }
  }, []);

  const fetchTimetable = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoadingTimetable(true);
      setError(null);
      try {
        const res = await fetch("/api/student/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxCourses,
            preferences: {
              avoidDays,
              avoidPeriods,
              preferredCourses,
            },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "AI 시간표를 불러오지 못했습니다.");
        }
        setTimetable(data?.timetable || []);
        setStats(data?.stats || null);
      } catch (err: any) {
        setError(err?.message || "AI 시간표 조회 중 오류가 발생했습니다.");
      } finally {
        if (!opts?.silent) setLoadingTimetable(false);
      }
    },
    [avoidDays, avoidPeriods, maxCourses, preferredCourses],
  );

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([loadProfile(), loadEnrollments()]);
      await fetchTimetable({ silent: true });
    };
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAvoidDay = (day: string) => {
    setAvoidDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const toggleAvoidPeriod = (period: number) => {
    setAvoidPeriods((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period],
    );
  };

  const handleEnroll = async (courseId: number, status: "requested" | "dropped") => {
    setEnrollError(null);
    setSubmittingCourse(courseId);
    try {
      const res = await fetch("/api/student/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "수강신청 처리에 실패했습니다.");
      }
      await loadEnrollments();
    } catch (err: any) {
      setEnrollError(err?.message || "수강신청 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmittingCourse(null);
    }
  };

  const resetFilters = () => {
    setAvoidDays([]);
    setAvoidPeriods([]);
    setPreferredInput("");
    setMaxCourses(4);
  };

  const activeEnrollments = enrollments.filter((item) => item.status !== "dropped");

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">
          {university} 수강신청 & AI 시간표
        </h1>
        <p className="mt-3 text-sm text-white/70">
          학과에서 정리한 개설 과목과 AI 스케줄러를 결합해, 겹치지 않는 개인 시간표를
          추천합니다. 요일, 교시, 선호 과목 조건을 조정하면 바로 새 제안을 확인할 수
          있습니다.
        </p>
        {profile && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/70">
            <div>
              <span className="text-white/50">학생 이름 </span>
              <span className="text-white">{profile.name || "-"}</span>
            </div>
            <div>
              <span className="text-white/50">전공 </span>
              <span className="text-white">{profile.major || "미등록"}</span>
            </div>
            <div>
              <span className="text-white/50">학년 </span>
              <span className="text-white">
                {profile.year ? `${profile.year}학년` : "미등록"}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-white">선호 조건</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn rounded-full px-5 py-2 text-sm text-white/90"
              onClick={() => fetchTimetable()}
              disabled={loadingTimetable}
            >
              {loadingTimetable ? "AI 추천 생성 중..." : "AI 추천 갱신"}
            </button>
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
              onClick={() => {
                resetFilters();
                fetchTimetable();
              }}
              disabled={loadingTimetable}
            >
              초기화
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm font-medium text-white/70">피하고 싶은 요일</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  onClick={() => toggleAvoidDay(day.value)}
                  className={`rounded-full px-4 py-2 text-sm ${
                    avoidDays.includes(day.value)
                      ? "bg-rose-500/80 text-white shadow-lg shadow-rose-500/30"
                      : "bg-white/10 text-white/80 hover:bg-white/20"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-white/70">피하고 싶은 교시</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PERIODS.map((period) => (
                <button
                  type="button"
                  key={period}
                  onClick={() => toggleAvoidPeriod(period)}
                  className={`rounded-full px-3 py-2 text-xs md:text-sm ${
                    avoidPeriods.includes(period)
                      ? "bg-amber-500/80 text-white shadow-lg shadow-amber-500/30"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {period}교시
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium text-white/70">
              최대 수강 과목 수
              <input
                type="number"
                min={1}
                max={9}
                value={maxCourses}
                onChange={(event) => setMaxCourses(Number(event.target.value) || 1)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="text-sm font-medium text-white/70">
              선호 과목 코드/ID
              <input
                type="text"
                placeholder="예: CS101, AI301"
                value={preferredInput}
                onChange={(event) => setPreferredInput(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
          </div>
        </div>
        {stats && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
              <div className="text-white/50">추천된 과목 수</div>
              <div className="mt-1 text-xl font-semibold text-white">
                {stats.selected_courses ?? 0} / 최대 {stats.max_courses ?? maxCourses}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
              <div className="text-white/50">전체 과목/배정</div>
              <div className="mt-1 text-xl font-semibold text-white">
                {stats.assigned_courses ?? 0} / {stats.total_courses ?? 0}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-white/80">
              <div className="text-white/50">적용된 규칙</div>
              <div className="mt-1">
                월~금, 1~9교시 / 교시당 60분{" "}
                {stats.applied_filters?.avoid_days?.length ? (
                  <span className="ml-1 text-emerald-300">
                    (회피 요일: {stats.applied_filters.avoid_days.join(", ")})
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">AI 추천 시간표</h2>
          <span className="text-sm text-white/60">
            {loadingTimetable
              ? "새 시간표 생성 중..."
              : `${timetable.length} 과목 추천`}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {timetable.map((row) => {
            const courseId = row.course?.id ?? 0;
            const active = courseId && activeEnrollmentMap.has(courseId);
            const isSubmitting = submittingCourse === courseId;

            return (
              <article
                key={`${courseId}-${row.slots.map((s) => s.timeslot_id).join("-")}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-white/50">과목</div>
                    <div className="text-lg font-semibold text-white">
                      {courseLabel(row.course)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-white/60">
                    {row.review?.average_overall ? (
                      <div>
                        평점{" "}
                        <span className="font-semibold text-amber-300">
                          {row.review.average_overall.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-white/40">평점 없음</div>
                    )}
                    <div>{row.review?.review_count || 0}개의 후기</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3 rounded-2xl bg-black/30 p-4 text-sm text-white/80">
                  <div className="font-medium text-white/60">시간</div>
                  <div className="space-y-1">
                    {row.slots.map((slot) => (
                      <div key={slot.timeslot_id}>
                        {slot.day_display} · {slot.period}교시 ({slot.start}~{slot.end})
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <div className="font-medium text-white/60">강의실</div>
                    <div>
                      {row.room?.name
                        ? `${row.room.name}${row.room.building ? ` (${row.room.building})` : ""}`
                        : "미정"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-white/50">
                    예상 수강인원 {row.course.expected_enrollment ?? "-"}명
                  </div>
                  <div className="flex gap-2">
                    {active ? (
                      <button
                        type="button"
                        onClick={() => handleEnroll(courseId, "dropped")}
                        disabled={isSubmitting}
                        className="rounded-full border border-rose-400/70 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/10"
                      >
                        {isSubmitting ? "취소 중..." : "수강 취소"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEnroll(courseId, "requested")}
                        disabled={isSubmitting}
                        className="btn rounded-full px-5 py-2 text-sm"
                      >
                        {isSubmitting ? "신청 중..." : "수강 신청"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {timetable.length === 0 && !loadingTimetable && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
            조건에 맞는 추천이 없습니다. 선호 과목 또는 회피 요일/교시를 조정해 보세요.
          </div>
        )}
        {enrollError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {enrollError}
          </div>
        )}
      </section>

      <ScheduleGrid rows={timetable} heading="주간 시간표 미리보기" />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">나의 수강신청 현황</h2>
          <span className="text-sm text-white/60">
            활성 {activeEnrollments.length}건 / 전체 {enrollments.length}건
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {enrollments.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
              아직 신청한 과목이 없습니다. 추천 목록에서 과목을 선택해 보세요.
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
                  <div className="text-xs text-white/50">
                    신청일 {formatDateTime(item.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      item.status === "requested"
                        ? "bg-emerald-500/20 text-emerald-200"
                        : item.status === "enrolled"
                        ? "bg-indigo-500/20 text-indigo-200"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.status !== "dropped" && (
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-4 py-1 text-xs text-white/70 hover:bg-white/10"
                      onClick={() => handleEnroll(item.course_id, "dropped")}
                      disabled={submittingCourse === item.course_id}
                    >
                      {submittingCourse === item.course_id ? "처리 중..." : "취소"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
