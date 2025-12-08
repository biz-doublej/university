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

type FixedSummary = {
  rows: number;
  courses: number;
  departments: string[];
  file: string;
};

type DepartmentStatus = {
  department: string;
  active: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [togglingEnrollment, setTogglingEnrollment] = useState<boolean>(false);
  const [enrollmentWindowEnd, setEnrollmentWindowEnd] = useState<string>("");
  const [fixedSummary, setFixedSummary] = useState<FixedSummary | null>(null);
  const [departments, setDepartments] = useState<DepartmentStatus[]>([]);
  const [deptMessage, setDeptMessage] = useState<string>("");
  const [togglingDepartment, setTogglingDepartment] = useState<string | null>(null);

  const loadSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/tenant-admin/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("tma_token");
          setToken(null);
          setMsg("세션이 만료되었습니다. 다시 로그인하세요.");
        }
        return;
      }
      const data = await res.json();
      setSummary(data);
      setEnrollmentWindowEnd(toLocalDateTime(data.enrollment_open_until));
    } catch (error: any) {
      setMsg(error?.message || String(error));
    }
  };

  const loadFixedSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/v1/tenant-admin/fixed-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setFixedSummary(data);
    } catch (error: any) {
      setDeptMessage(error?.message || "고정 데이터를 불러오는 중 문제가 발생했습니다.");
    }
  };

  const loadDepartments = async () => {
    if (!token) {
      setDepartments([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/v1/tenant-admin/department-activations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setDepartments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setDeptMessage(error?.message || "학과 목록을 불러오지 못했습니다.");
    }
  };

  const toggleDepartment = async (department: string, active: boolean) => {
    if (!token) {
      setDeptMessage("먼저 로그인하세요.");
      return;
    }
    setTogglingDepartment(department);
    setDeptMessage("");
    try {
      const res = await fetch(`${API_BASE}/v1/tenant-admin/department-activations/${encodeURIComponent(
        department,
      )}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setDeptMessage(`${data.department}의 수강신청이 ${data.active ? "활성화" : "비활성화"}되었습니다.`);
      await loadDepartments();
    } catch (error: any) {
      setDeptMessage(error?.message || "학과 활성화 중 오류가 발생했습니다.");
    } finally {
      setTogglingDepartment(null);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setFixedSummary(null);
      setDepartments([]);
      return;
    }
    void Promise.all([loadSummary(), loadFixedSummary(), loadDepartments()]);
  }, [token]);

  const toggleEnrollmentWindow = async (open: boolean) => {
    if (!token) {
      setMsg("먼저 로그인하세요.");
      return;
    }
    try {
      setTogglingEnrollment(true);
      const body: Record<string, any> = { open };
      if (open && enrollmentWindowEnd) {
        body.expires_at = new Date(enrollmentWindowEnd).toISOString();
      }
      const r = await fetch(`${API_BASE}/v1/tenant-admin/enrollment-window`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
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
        <h1 className="text-2xl font-semibold">대학 운영 포털</h1>
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
        <h1 className="text-2xl font-semibold">대학 운영 포털</h1>
        <p className="text-white/70">
          학사 데이터를 업로드하고 학생/교원 포털에서 활용되는 AI 서비스를 실시간으로 조율합니다.
        </p>
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

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">고정 학사 데이터</h2>
          <p className="text-sm text-white/60">
            현재 시스템은 <span className="font-semibold">{fixedSummary?.file || "정해진 데이터"}</span>를 기준으로 동작합니다.
            XLSX/CSV/JSON 업로드 없이도 캠퍼스 전체 템플릿을 항상 유지합니다.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="text-xs uppercase tracking-[0.4em] text-white/50">총 행 수</div>
            <div className="mt-2 text-2xl font-semibold text-white">{fixedSummary?.rows ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="text-xs uppercase tracking-[0.4em] text-white/50">고유 과목</div>
            <div className="mt-2 text-2xl font-semibold text-white">{fixedSummary?.courses ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="text-xs uppercase tracking-[0.4em] text-white/50">학과 카운트</div>
            <div className="mt-2 text-2xl font-semibold text-white">{fixedSummary?.departments.length ?? 0}</div>
          </div>
        </div>
        <div className="text-xs text-white/60">
          실제 데이터: <code className="rounded-full bg-white/10 px-2 py-1">{fixedSummary?.file || "20250915_개설강좌조회(학생).xlsx"}</code>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">학과별 수강신청 제어</h2>
          <p className="text-sm text-white/60">
            위의 고정 데이터에 포함된 학과를 선택하고 수강신청 창을 개별적으로 켜거나 끌 수 있습니다.
          </p>
        </div>
        {deptMessage && <div className="text-xs text-rose-200">{deptMessage}</div>}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <article
              key={dept.department}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">{dept.department}</div>
                  <div className="text-xs text-white/50">고정 데이터 내 학과</div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    dept.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                  }`}
                >
                  {dept.active ? "활성화" : "비활성"}
                </span>
              </div>
              <button
                type="button"
                className="btn rounded-full px-4 py-2 text-xs"
                onClick={() => toggleDepartment(dept.department, !dept.active)}
                disabled={togglingDepartment === dept.department}
              >
                {togglingDepartment === dept.department
                  ? "처리 중..."
                  : dept.active
                  ? "비활성화"
                  : "수강신청 활성화"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {msg && <div className="text-sm text-white/70">{msg}</div>}
    </div>
  );
}
