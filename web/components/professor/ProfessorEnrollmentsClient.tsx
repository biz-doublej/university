"use client";

import { useEffect, useMemo, useState } from "react";

type Course = {
  course_id: number;
  course_code?: string | null;
  course_name: string;
  avg_rating?: number | null;
  review_count: number;
  enrollment_count: number;
};

type Props = {
  university: string;
};

export default function ProfessorEnrollmentsClient({ university }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expansionRequests, setExpansionRequests] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/faculty/courses");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "강의 정보를 불러오지 못했습니다.");
        }
        setCourses(data || []);
      } catch (err: any) {
        setError(err?.message || "강의 정보를 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses
      .filter((course) => {
        if (!keyword) return true;
        return (
          course.course_name.toLowerCase().includes(keyword) ||
          (course.course_code ?? "").toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => b.enrollment_count - a.enrollment_count);
  }, [courses, search]);

  const highDemand = filteredCourses.filter((course) => course.enrollment_count >= threshold);

  const toggleExpansion = (courseId: number) => {
    setExpansionRequests((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 강의 정원 관리</h1>
        <p className="mt-3 text-sm text-white/70">
          실시간 수강신청 데이터를 기반으로 정원 초과 가능성이 있는 강의를 빠르게 확인하고,
          정원 확대 요청을 기록해 행정팀과 공유할 수 있습니다. 우선권·재수강 대상 필터로
          유연한 대기자 관리를 도와줍니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/70">
          <label className="flex items-center gap-2">
            <span className="text-white/60">검색</span>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="과목명 또는 코드"
              className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-white/60">정원 경고 기준</span>
            <input
              type="number"
              min={5}
              max={200}
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value) || 30)}
              className="w-20 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-center text-white focus:border-indigo-400 focus:outline-none"
            />
            <span className="text-white/40">명 이상</span>
          </label>
          <span className="text-white/50">
            경고 대상 {highDemand.length} / 전체 {filteredCourses.length}
          </span>
        </div>
        {loading && <div className="mt-3 text-sm text-white/60">데이터를 불러오는 중...</div>}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">수강신청 현황</h2>
          <span className="text-sm text-white/60">가장 많은 수강생 순 정렬</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/80">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-4 py-2 text-left">과목</th>
                <th className="px-4 py-2 text-right">수강신청</th>
                <th className="px-4 py-2 text-right">후기</th>
                <th className="px-4 py-2 text-right">평균 평점</th>
                <th className="px-4 py-2 text-right">정원 확대 요청</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-white/60">
                    조건에 맞는 강의가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => {
                  const overThreshold = course.enrollment_count >= threshold;
                  const requested = expansionRequests.has(course.course_id);
                  return (
                    <tr
                      key={course.course_id}
                      className={overThreshold ? "bg-rose-500/10" : ""}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">
                          {[course.course_code, course.course_name].filter(Boolean).join(" · ")}
                        </div>
                        {overThreshold && (
                          <div className="text-xs text-rose-200">정원 확대 검토 필요</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {course.enrollment_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.review_count.toLocaleString()}건
                      </td>
                      <td className="px-4 py-3 text-right">
                        {course.avg_rating ? course.avg_rating.toFixed(2) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => toggleExpansion(course.course_id)}
                          className={`rounded-full px-3 py-1 text-xs ${
                            requested
                              ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/50"
                              : "border border-white/20 text-white/70 hover:bg-white/10"
                          }`}
                        >
                          {requested ? "요청 등록됨" : "정원 확대 요청"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">우선 조치 리스트</h2>
        {highDemand.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">
            정원 경고 기준을 초과한 강의가 없습니다.
          </div>
        ) : (
          <ol className="mt-4 space-y-3 text-sm text-white/80">
            {highDemand.map((course) => (
              <li key={course.course_id} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">
                    {[course.course_code, course.course_name].filter(Boolean).join(" · ")}
                  </div>
                  <span className="text-xs text-white/50">
                    신청 {course.enrollment_count.toLocaleString()}명 · 후기 {course.review_count}
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/50">
                  재수강/우선권 대상자를 별도로 확인해 중복 신청 여부를 검토하세요.
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
