"use client";

import { useEffect, useState } from "react";

type Summary = {
  courses: number;
  students: number;
  enrollments: number;
  reviews: number;
  ai_portal_enabled?: boolean;
  enrollment_open?: boolean;
  enrollment_open_until?: string | null;
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

function toLocalDateTime(iso?: string | null) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(
    parsed.getHours(),
  )}:${pad(parsed.getMinutes())}`;
}

function formatDeadline(iso?: string | null) {
  if (!iso) return "미정";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "미정";
  return parsed.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export default function TenantAdminPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payload, setPayload] = useState<string>(SAMPLE_PAYLOAD);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [aiKey, setAiKey] = useState<string | null>(null);
  const [togglingEnrollment, setTogglingEnrollment] = useState<boolean>(false);
  const [enrollmentWindowEnd, setEnrollmentWindowEnd] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setSummary(null);
        return;
      }
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
        setEnrollmentWindowEnd(toLocalDateTime(j.enrollment_open_until));
      } catch (err: any) {
        setMsg(err?.message || String(err));
      }
    };
    void load();
  }, [token]);

  const loadSummary = async () => {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/v1/tenant-admin/summary`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return;
      const j = await r.json();
      setSummary(j);
      setEnrollmentWindowEnd(toLocalDateTime(j.enrollment_open_until));
    } catch (err: any) {
      setMsg(err?.message || String(err));
    }
  };

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
      await loadSummary();
    } catch (err: any) {
      setMsg(`업로드 실패: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const issueAiKey = async () => {
    if (!token) {
      setMsg("먼저 로그인하세요.");
      return;
    }
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/v1/tenant-admin/ai-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: "portal" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setAiKey(j.ai_key);
      setMsg("AI 키가 발급되었습니다. 페이지 구성에 사용하세요.");
      await loadSummary();
    } catch (err: any) {
      setMsg(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleEnrollmentWindow = async (open: boolean) => {
    if (!token) {
      setMsg("먼저 로그인하세요.");
      return;
    }
    try {
      setTogglingEnrollment(true);
      const payload: Record<string, any> = { open };
      if (open && enrollmentWindowEnd) {
        payload.expires_at = new Date(enrollmentWindowEnd).toISOString();
      }
      const r = await fetch(`${API_BASE}/v1/tenant-admin/enrollment-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setMsg(open ? "수강신청을 오픈했습니다." : "수강신청을 마감했습니다.");
      await loadSummary();
    } catch (err: any) {
      setMsg(err?.message || String(err));
    } finally {
      setTogglingEnrollment(false);
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

  const metrics =
    summary || {
      courses: 0,
      students: 0,
      enrollments: 0,
      reviews: 0,
      ai_portal_enabled: false,
      enrollment_open: false,
      enrollment_open_until: null,
    };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">대학 관리자 포털 (베타)</h1>
        <p className="text-white/70">학사 데이터를 업로드하고 학생/교원 포털에서 활용되는 AI 서비스를 제어합니다.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <div className="card">
          <div className="text-xs uppercase text-white/50">Courses</div>
          <div className="text-2xl font-semibold">{metrics.courses}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-white/50">Students</div>
          <div className="text-2xl font-semibold">{metrics.students}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-white/50">Enrollments</div>
          <div className="text-2xl font-semibold">{metrics.enrollments}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-white/50">Reviews</div>
          <div className="text-2xl font-semibold">{metrics.reviews}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-white/50">AI Portal</div>
          <div className="text-lg font-semibold">{metrics.ai_portal_enabled ? "Enabled" : "Pending"}</div>
          <div className="text-xs text-white/60 mt-1">관리자 승인이 필요합니다.</div>
        </div>
        <div className="card space-y-2">
          <div className="text-xs uppercase text-white/50">Enrollment Window</div>
          <div className="text-lg font-semibold">{metrics.enrollment_open ? "Open" : "Closed"}</div>
          <button
            className="btn text-xs"
            onClick={() => toggleEnrollmentWindow(!metrics.enrollment_open)}
            disabled={togglingEnrollment}
          >
            {togglingEnrollment
              ? "처리 중..."
              : metrics.enrollment_open
              ? "수강신청 마감"
              : "수강신청 오픈"}
          </button>
          <label className="text-xs text-white/60">활성화 종료</label>
          <input
            type="datetime-local"
            value={enrollmentWindowEnd}
            onChange={(event) => setEnrollmentWindowEnd(event.target.value)}
            className="w-full rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs text-white/80 focus:border-indigo-400 focus:outline-none"
          />
          {metrics.enrollment_open_until && (
            <div className="text-xs text-white/60">
              현재 종료: {formatDeadline(metrics.enrollment_open_until)}
            </div>
          )}
          <div className="text-xs text-white/60">
            학생 포털에서 수강신청 가능 여부를 제어합니다.
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">AI 포털 키 발급</div>
            <div className="text-xs text-white/60">승인된 학교만 발급 가능합니다. 발급된 키는 1회만 표시됩니다.</div>
          </div>
          <button className="btn text-xs" onClick={issueAiKey} disabled={!metrics.ai_portal_enabled || loading}>
            {metrics.ai_portal_enabled ? "AI Key 발급" : "승인 대기"}
          </button>
        </div>
        {!metrics.ai_portal_enabled && (
          <div className="text-xs text-white/60">글로벌 관리자에게 승인을 요청해주세요.</div>
        )}
        {aiKey && (
          <div className="text-sm text-white/80">
            <div>발급된 AI Key (한번만 표시):</div>
            <code className="block bg-white/10 p-2 rounded mt-2 break-all">{aiKey}</code>
          </div>
        )}
      </div>

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
