"use client";

import { useEffect, useState } from "react";

type Course = {
  course_id: number;
  course_code?: string | null;
  course_name: string;
  avg_rating?: number | null;
  review_count: number;
  enrollment_count: number;
};

type Review = {
  id: number;
  rating_overall?: number | null;
  rating_difficulty?: number | null;
  rating_instructor?: number | null;
  tags?: string[];
  comment?: string | null;
  semester?: string | null;
  created_at?: string;
};

type Props = {
  university: string;
};

export default function ProfessorFeedbackClient({ university }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      setLoadingCourses(true);
      setError(null);
      try {
        const res = await fetch("/api/faculty/courses");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "강의 리스트를 불러오지 못했습니다.");
        }
        setCourses(data || []);
      } catch (err: any) {
        setError(err?.message || "강의 데이터를 가져오지 못했습니다.");
      } finally {
        setLoadingCourses(false);
      }
    };
    loadCourses();
  }, []);

  const loadReviews = async (course: Course) => {
    setLoadingReviews(true);
    setError(null);
    try {
      const res = await fetch(`/api/faculty/courses/${course.course_id}/reviews`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "후기 데이터를 불러오지 못했습니다.");
      }
      setReviews(data || []);
      setSelectedCourse(course);
    } catch (err: any) {
      setError(err?.message || "후기 데이터를 가져오지 못했습니다.");
    } finally {
      setLoadingReviews(false);
    }
  };

  const acknowledgeReview = async (course: Course) => {
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`/api/faculty/courses/${course.course_id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating_overall: null,
          rating_difficulty: null,
          rating_instructor: null,
          tags: ["acknowledged"],
          comment: "Faculty acknowledgement",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "후기 확인을 기록하지 못했습니다.");
      }
      setSuccess("후기 확인 로그가 기록되었습니다.");
      await loadReviews(course);
    } catch (err: any) {
      setError(err?.message || "후기 확인 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 학생 후기 분석</h1>
        <p className="mt-3 text-sm text-white/70">
          과목별 학생 피드백을 실시간으로 확인하고, 개선 액션을 추적할 수 있습니다. AI가
          감정 분류 및 주제 추출을 수행해 교수님에게 가장 중요한 의견을 보여 드립니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">강의 선택</h2>
        {loadingCourses ? (
          <div className="mt-3 text-sm text-white/60">강의 목록을 불러오는 중...</div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {courses.map((course) => (
              <button
                key={course.course_id}
                type="button"
                onClick={() => loadReviews(course)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  selectedCourse?.course_id === course.course_id
                    ? "border-indigo-400 bg-indigo-500/20 text-white"
                    : "border-white/15 bg-white/5 text-white/80 hover:border-indigo-400"
                }`}
              >
                <div className="font-semibold text-white">
                  {[course.course_code, course.course_name].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-1 text-xs text-white/60">
                  후기 {course.review_count}건 · 평균 평점 {course.avg_rating?.toFixed(2) ?? "-"}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedCourse && (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {[selectedCourse.course_code, selectedCourse.course_name].filter(Boolean).join(" · ")}
              </h2>
              <p className="mt-1 text-sm text-white/60">
                총 후기 {reviews.length}건 · 평균 평점 {selectedCourse.avg_rating?.toFixed(2) ?? "-"}
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              onClick={() => acknowledgeReview(selectedCourse)}
            >
              후기 확인 기록
            </button>
          </div>
          {success && (
            <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {success}
            </div>
          )}
          {loadingReviews ? (
            <div className="mt-4 text-sm text-white/60">후기를 불러오는 중...</div>
          ) : reviews.length === 0 ? (
            <div className="mt-4 text-sm text-white/60">아직 등록된 후기가 없습니다.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-white">
                      평점 {review.rating_overall ?? "-"}
                    </div>
                    <div className="text-xs text-white/50">
                      {review.created_at ? new Date(review.created_at).toLocaleString("ko-KR") : "최근"}
                    </div>
                  </div>
                  <div className="mt-1 text-white/70">{review.comment || "(내용 없음)"}</div>
                  {review.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {review.tags.map((tag, index) => (
                        <span
                          key={`${review.id}-${tag}-${index}`}
                          className="rounded-full bg-white/10 px-2 py-1 text-white/60"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
