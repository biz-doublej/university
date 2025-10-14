"use client";

import { useEffect, useState } from "react";

type Summary = {
  courses: number;
  students: number;
  enrollments: number;
  reviews: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const SAMPLE_PAYLOAD = JSON.stringify(
  {
    courses: [
      { code: "AI101", name: "인공지능 개론", expected_enrollment: 60 },
      { code: "CS205", name: "알고리즘 실습", expected_enrollment: 40 },
    ],
    students: [
      { email: "hana@univ.ac.kr", name: "한아름", major: "AI", year: 2 },
      { email: "min@univ.ac.kr", name: "김민수", major: "CS", year: 3 },
    ],
    enrollments: [
      { student_email: "hana@univ.ac.kr", course_code: "AI101", status: "enrolled", term: "2025-Spring" },
      { student_email: "min@univ.ac.kr", course_code: "CS205", status: "enrolled", term: "2025-Spring" },
    ],
    reviews: [
      { student_email: "hana@univ.ac.kr", course_code: "AI101", rating_overall: 5, tags: ["흥미로움"], comment: "AI의 기본 개념을 빠르게 이해했어요." },
    ],
  },
  null,
  2,
);

export default function TenantAdminPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payload, setPayload] = useState<string>(SAMPLE_PAYLOAD);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      return;
    }
    const run = async () => {
      try {
        const r = await fetch(`${API_BASE}/v1/tenant-admin/summary`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 401) {
          localStorage.removeItem("tma_token");
          setToken(null);
          setMsg("세션이 만료되었습니다. 다시 로그인하세요.");
          return;
        }
        const j = await r.json();
        setSummary(j);
      } catch (err: any) {
        setMsg(err?.message || String(err));
      }
    };
    void run();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setMsg("먼저 로그인하세요.");
      return;
    }
    try {
      const parsed = JSON.parse(payload);
      setLoading(true);
      const r = await fetch(`${API_BASE}/v1/tenant-admin/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsed),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setMsg(`업로드 완료: ${JSON.stringify(j)}`);
      const refreshed = await fetch(`${API_BASE}/v1/tenant-admin/summary`, { headers: { Authorization: `Bearer ${token}` } });
      setSummary(await refreshed.json());
    } catch (err: any) {
      setMsg(`업로드 실패: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">대학 관리자 포털 (베타)</h1>
        <p className="text-white/70">이 페이지는 테넌트 관리자 권한이 있는 계정만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">대학 관리자 포털 (베타)</h1>
        <p className="text-white/70">학사 데이터를 업로드하고 학생/교원 포털에서 활용되는 AI 서비스를 제어합니다.</p>
      </div>

      {summary && (
        <div className="grid md:grid-cols-4 gap-3">
          {Object.entries(summary).map(([key, value]) => (
            <div key={key} className="card">
              <div className="text-xs uppercase text-white/50">{key}</div>
              <div className="text-2xl font-semibold">{value}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">JSON 데이터 업로드</label>
          <textarea
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[260px]"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
          <div className="text-xs text-white/60">courses/students/enrollments/reviews 배열을 포함한 JSON을 입력하세요.</div>
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? "업로드 중…" : "데이터 업로드"}</button>
      </form>

      {msg && <div className="text-sm text-white/70">{msg}</div>}
    </div>
  );
}
