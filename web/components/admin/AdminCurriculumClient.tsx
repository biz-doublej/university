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

const DAYS = [
  { value: "Mon", label: "월" },
  { value: "Tue", label: "화" },
  { value: "Wed", label: "수" },
  { value: "Thu", label: "목" },
  { value: "Fri", label: "금" },
];

const PALETTE = [
  "rgba(125, 211, 252, 0.9)",
  "rgba(167, 139, 250, 0.9)",
  "rgba(74, 222, 128, 0.9)",
  "rgba(251, 191, 36, 0.9)",
  "rgba(248, 113, 113, 0.9)",
  "rgba(96, 165, 250, 0.9)",
];

type TimetableRow = {
  room_id: number;
  room_name: string | null;
  day: string;
  start: string;
  end: string;
  course_code: string | null;
  course_name: string | null;
  department: string | null;
  cohort: string | null;
};

export default function AdminCurriculumClient({ university }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [status, setStatus] = useState<OptimizeStatus | null>(null);
  const [fixedSummary, setFixedSummary] = useState<FixedSummary | null>(null);
  const [timetable, setTimetable] = useState<TimetableRow[]>([]);
  const [ttLoading, setTtLoading] = useState(false);
  const [filters, setFilters] = useState({ department: "", cohort: "" });

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
      void loadTimetable();
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

  const loadTimetable = useCallback(async () => {
    setTtLoading(true);
    try {
      const res = await fetch(`/api/timetable/rooms?week=2025-01&tenant=${encodeURIComponent(university)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "배정 결과를 불러오지 못했습니다.");
      }
      setTimetable(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "배정 결과를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setTtLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTimetable();
  }, [loadTimetable]);

  const filtered = timetable.filter((row) => {
    const depOk = filters.department ? (row.department || "").includes(filters.department) : true;
    const cohortOk = filters.cohort ? (row.cohort || "").includes(filters.cohort) : true;
    return depOk && cohortOk;
  });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const header = ["day", "start", "end", "room_name", "course_code", "course_name", "department", "cohort"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          r.day,
          r.start,
          r.end,
          r.room_name ?? "",
          r.course_code ?? "",
          r.course_name ?? "",
          r.department ?? "",
          r.cohort ?? "",
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timetable.csv";
    a.click();
    URL.revokeObjectURL(url);
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
          <MetricCard title="데이터 크기" value={scoreboard.students.toLocaleString()} />
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

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">배정 결과</h2>
            <p className="mt-1 text-sm text-white/60">학과·학년/반(코호트) 필터 후 JSON/CSV로 다운로드할 수 있습니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filters.department}
              onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
              placeholder="학과 입력 (예: 간호학과)"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
            <input
              type="text"
              value={filters.cohort}
              onChange={(e) => setFilters((f) => ({ ...f, cohort: e.target.value }))}
              placeholder="학년/반 (예: 2-A)"
              className="rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={exportJson}
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
            >
              JSON 다운로드
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-white hover:bg-white/10"
            >
              CSV 다운로드
            </button>
          </div>
        </div>
        {ttLoading && <div className="mt-3 text-sm text-white/60">배정 결과 불러오는 중...</div>}
        <div className="mt-4">
          <TimetableGrid rows={filtered} />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm text-white/80">
            <thead>
              <tr>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">요일</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">시간</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">강의실</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">과목코드</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">과목명</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">학과</th>
                <th className="border border-white/10 px-3 py-2 text-left text-white/60">학년/반</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="border border-white/10 px-3 py-2 text-center text-white/60" colSpan={7}>
                    배정 결과가 없습니다. 조건을 완화하거나 배정을 실행하세요.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={`${row.day}-${row.start}-${row.room_id}-${idx}`}>
                    <td className="border border-white/10 px-3 py-2">{row.day}</td>
                    <td className="border border-white/10 px-3 py-2">{row.start} ~ {row.end}</td>
                    <td className="border border-white/10 px-3 py-2">{row.room_name ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2">{row.course_code ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2">{row.course_name ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2">{row.department ?? "-"}</td>
                    <td className="border border-white/10 px-3 py-2">{row.cohort ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

function TimetableGrid({ rows }: { rows: TimetableRow[] }) {
  const hours = Array.from({ length: 10 }, (_, i) => 9 + i); // 09~18

  const byCourseColor = (course: string | null | undefined) => {
    if (!course) return PALETTE[0];
    const idx = Math.abs(hashCode(course)) % PALETTE.length;
    return PALETTE[idx];
  };

  const blocks = rows.map((row) => {
    const startHour = parseInt(row.start.split(":")[0], 10);
    const endHour = parseInt(row.end.split(":")[0], 10);
    const duration = Math.max(1, endHour - startHour);
    const rowStart = startHour - 9 + 1; // grid row start (1-based)
    const dayIndex = DAYS.findIndex((d) => d.value === row.day);
    const colStart = dayIndex + 2; // first column is time labels
    return {
      ...row,
      duration,
      rowStart,
      colStart,
      color: byCourseColor(row.course_code || row.course_name),
    };
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: "80px repeat(5, 1fr)",
          gridTemplateRows: "repeat(10, minmax(60px, auto))",
        }}
      >
        {/* Time column */}
        {hours.map((h, idx) => (
          <div
            key={`time-${h}`}
            className="border border-white/10 px-2 py-2 text-sm text-white/60"
            style={{ gridColumnStart: 1, gridRowStart: idx + 1 }}
          >
            {`${h.toString().padStart(2, "0")}:00`}
          </div>
        ))}

        {/* Day headers */}
        {DAYS.map((d, i) => (
          <div
            key={`day-header-${d.value}`}
            className="border border-white/10 px-2 py-2 text-center text-sm font-semibold text-white/80"
            style={{ gridColumnStart: i + 2, gridRowStart: 1 }}
          >
            {d.label}
          </div>
        ))}

        {/* Empty cells for grid structure */}
        {DAYS.map((d, i) =>
          hours.map((h, idx) => (
            <div
              key={`cell-${d.value}-${h}`}
              className="border border-white/5"
              style={{ gridColumnStart: i + 2, gridRowStart: idx + 1 }}
            />
          )),
        )}

        {/* Blocks */}
        {blocks.map((b, idx) => (
          <div
            key={`${b.course_code || b.course_name}-${idx}`}
            className="overflow-hidden rounded-lg border border-white/20 p-2 text-xs shadow-md"
            style={{
              gridColumnStart: b.colStart,
              gridRowStart: b.rowStart,
              gridRowEnd: `span ${b.duration}`,
              backgroundColor: b.color,
            }}
          >
            <div className="font-semibold text-white">{b.course_name || b.course_code}</div>
            <div className="text-white/80">
              {b.course_code} · {b.department || "-"} · {b.cohort || "-"}
            </div>
            <div className="text-white/80">{b.room_name || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
