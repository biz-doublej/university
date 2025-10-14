"use client";

import { useEffect, useState } from "react";

type FacultyCourse = {
  course_id: number;
  course_code?: string | null;
  course_name: string;
  avg_rating?: number | null;
  review_count: number;
  enrollment_count: number;
};

type CourseReview = {
  id: number;
  rating_overall?: number | null;
  rating_difficulty?: number | null;
  rating_instructor?: number | null;
  tags: string[];
  comment?: string | null;
  semester?: string | null;
  created_at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function FacultyPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setCourses([]);
      setReviews([]);
      return;
    }
    const authHeader = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API_BASE}/v1/faculty/courses`, { headers: authHeader });
        if (r.status === 401) {
          localStorage.removeItem("tma_token");
          setToken(null);
          setMsg("세션이 만료되었습니다. 다시 로그인하세요.");
          return;
        }
        const j = await r.json();
        if (Array.isArray(j)) {
          setCourses(j);
          if (j.length > 0) {
            setSelectedCourse(j[0].course_id);
          }
        }
      } catch (err: any) {
        setMsg(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedCourse) {
      setReviews([]);
      return;
    }
    const fetchReviews = async () => {
      try {
        const r = await fetch(`${API_BASE}/v1/faculty/courses/${selectedCourse}/reviews`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        if (Array.isArray(j)) setReviews(j);
      } catch (err: any) {
        setMsg(err?.message || String(err));
      }
    };
    void fetchReviews();
  }, [token, selectedCourse]);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">교원 포털 (베타)</h1>
        <p className="text-white/70">이 페이지는 교수/교강사 역할 계정만 접근할 수 있습니다. 상단 우측에서 로그인 후 역할을 Faculty로 설정하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">교원 포털 (베타)</h1>
        <p className="text-white/70">강의 만족도, 수강 현황, 학생 피드백을 한 곳에서 확인하세요.</p>
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-medium">담당 강의 목록</div>
            <div className="text-xs text-white/60">현재 테넌트 내에서 담당 중인 강의 기준이며, 추후 역할 기반 필터를 연결할 수 있습니다.</div>
          </div>
          <div>
            <select className="input" value={selectedCourse ?? ""} onChange={(e) => setSelectedCourse(e.target.value ? Number(e.target.value) : null)}>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div key={course.course_id} className={`card ${selectedCourse === course.course_id ? "ring-2 ring-sky-400" : ""}`}>
              <div className="font-medium">{course.course_name}</div>
              <div className="text-xs text-white/60">{course.course_code || "코드 미지정"}</div>
              <div className="text-sm text-white/80 mt-2">평균 평점: {course.avg_rating ? course.avg_rating.toFixed(2) : "N/A"}</div>
              <div className="text-sm text-white/80">후기 수: {course.review_count}</div>
              <div className="text-sm text-white/80">수강 인원: {course.enrollment_count}</div>
            </div>
          ))}
          {!courses.length && (
            <div className="text-sm text-white/60">등록된 강의가 없습니다. 관리자에게 데이터를 등록해달라고 요청하세요.</div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-semibold">선택한 강의의 최근 후기</div>
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="card space-y-2">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>총평: {review.rating_overall ?? "-"}</span>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-xs text-white/60">난이도 {review.rating_difficulty ?? "-"} / 강의력 {review.rating_instructor ?? "-"}</div>
              {review.tags?.length ? (
                <div className="flex flex-wrap gap-2 text-xs text-white/60">
                  {review.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/10 rounded">#{tag}</span>
                  ))}
                </div>
              ) : null}
              {review.comment && <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{review.comment}</div>}
            </div>
          ))}
          {!reviews.length && (
            <div className="card text-sm text-white/60">아직 후기가 없습니다. 학기 종료 후 학생들이 평가를 입력하면 자동으로 집계됩니다.</div>
          )}
        </div>
      </div>

      {msg && <div className="text-sm text-rose-300">{msg}</div>}
      {loading && <div className="text-sm text-white/60">데이터를 불러오는 중…</div>}
    </div>
  );
}
