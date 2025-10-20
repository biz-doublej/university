"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { EnrollmentItem } from "./types";

type Props = {
  university: string;
};

type SubmittedReview = {
  courseLabel: string;
  rating: number | null;
  comment: string;
  createdAt: Date;
};

export default function StudentReviewsClient({ university }: Props) {
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [ratingOverall, setRatingOverall] = useState<number | "">("");
  const [ratingDifficulty, setRatingDifficulty] = useState<number | "">("");
  const [ratingInstructor, setRatingInstructor] = useState<number | "">("");
  const [tags, setTags] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<SubmittedReview[]>([]);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const res = await fetch("/api/student/enrollments");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "수강신청 정보를 불러오지 못했습니다.");
        }
        setEnrollments(data || []);
      } catch (err: any) {
        setError(err?.message || "수강신청 정보를 불러올 수 없습니다.");
      }
    };
    loadEnrollments();
  }, []);

  const enrollmentOptions = useMemo(
    () =>
      enrollments.filter((item) => item.status !== "dropped").map((item) => ({
        id: item.course_id,
        label: [item.course_code, item.course_name].filter(Boolean).join(" · "),
      })),
    [enrollments],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (!selectedCourseId) {
        throw new Error("과목을 선택해 주세요.");
      }
      const body = {
        course_id: Number(selectedCourseId),
        rating_overall: ratingOverall === "" ? null : Number(ratingOverall),
        rating_difficulty: ratingDifficulty === "" ? null : Number(ratingDifficulty),
        rating_instructor: ratingInstructor === "" ? null : Number(ratingInstructor),
        tags: tags
          .split(/[;,\s]+/)
          .map((token) => token.trim())
          .filter(Boolean),
        comment,
        semester: semester || null,
      };
      const res = await fetch("/api/student/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "후기를 저장하지 못했습니다.");
      }
      const label = enrollmentOptions.find((option) => option.id === Number(selectedCourseId))?.label ?? "과목";
      setSubmitted((prev) => [
        {
          courseLabel: label,
          rating: body.rating_overall,
          comment,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setSuccess("후기가 제출되었습니다. 교수진/행정팀에 익명으로 공유됩니다.");
      setComment("");
      setTags("");
    } catch (err: any) {
      setError(err?.message || "후기를 저장하는 중 문제가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 수업 후기</h1>
        <p className="mt-3 text-sm text-white/70">
          강의 만족도, 난이도, 강사 피드백을 익명으로 제출하면 AI가 자동 요약하여 교수 및
          학사팀에 전달합니다. 제출한 내용은 Timora AI 추천 모델 개선에도 활용됩니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">후기 작성</h2>
        <form className="mt-4 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-white/70">
            과목 선택
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value ? Number(event.target.value) : "")}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              required
            >
              <option value="">과목을 선택하세요</option>
              {enrollmentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-white/70">
              전체 만족도 (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={ratingOverall}
                onChange={(event) => setRatingOverall(event.target.value === "" ? "" : Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="text-sm font-medium text-white/70">
              난이도 (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={ratingDifficulty}
                onChange={(event) =>
                  setRatingDifficulty(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
            <label className="text-sm font-medium text-white/70">
              강의 전달력 (1-5)
              <input
                type="number"
                min={1}
                max={5}
                value={ratingInstructor}
                onChange={(event) =>
                  setRatingInstructor(event.target.value === "" ? "" : Number(event.target.value))
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-white/70">
            태그 (쉼표 구분)
            <input
              type="text"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="예: 실습강의, 팀프로젝트"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-white/70">
            한줄 리뷰
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              placeholder="익명으로 공유됩니다. 솔직한 피드백을 남겨주세요."
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>

          <label className="block text-sm font-medium text-white/70">
            수강 학기 (선택)
            <input
              type="text"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              placeholder="예: 2025-1"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn rounded-full px-5 py-2 text-sm"
              disabled={submitting}
            >
              {submitting ? "제출 중..." : "후기 제출"}
            </button>
            {success && <span className="text-sm text-emerald-300">{success}</span>}
          </div>
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">내가 남긴 후기</h2>
        {submitted.length === 0 ? (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
            아직 제출한 후기가 없습니다. 첫 후기를 남겨 보세요!
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {submitted.map((item, index) => (
              <div
                key={`${item.courseLabel}-${index}`}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">{item.courseLabel}</div>
                  <div className="text-xs text-white/50">
                    {item.createdAt.toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="mt-2 text-white/70">
                  평점 {item.rating ?? "-"} / 한줄 리뷰: {item.comment || "(내용 없음)"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
