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

type DatasetRecord = {
  id: number;
  filename: string;
  file_type?: string | null;
  rows: number;
  summary: Record<string, number>;
  active: boolean;
  uploaded_at: string;
  activated_at: string | null;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadMsg, setFileUploadMsg] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [activatingDatasetId, setActivatingDatasetId] = useState<number | null>(null);

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

  const loadDatasets = async () => {
    if (!token) {
      setDatasets([]);
      return;
    }
    setLoadingDatasets(true);
    try {
      const res = await fetch(`${API_BASE}/v1/tenant-admin/datasets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setDatasets(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setFileUploadMsg(error?.message || "업로드된 데이터 목록을 불러오지 못했습니다.");
    } finally {
      setLoadingDatasets(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setSummary(null);
      setDatasets([]);
      return;
    }
    void Promise.all([loadSummary(), loadDatasets()]);
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
      await loadSummary();
      await loadDatasets();
    } catch (err: any) {
      setMsg(`업로드 실패: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const uploadDataFile = async () => {
    if (!token) {
      setFileUploadMsg("먼저 로그인하세요.");
      return;
    }
    if (!selectedFile) {
      setFileUploadMsg("업로드할 파일을 선택하세요.");
      return;
    }
    setUploadingFile(true);
    setFileUploadMsg("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(`${API_BASE}/v1/import/dataset/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.reason || `HTTP ${res.status}`);
      }
      setFileUploadMsg(`파일 업로드 완료: ${data.file}`);
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      await loadSummary();
    } catch (err: any) {
      setFileUploadMsg(err?.message || "파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingFile(false);
    }
  };

  const activateDataset = async (datasetId: number) => {
    if (!token) {
      setFileUploadMsg("먼저 로그인하세요.");
      return;
    }
    setActivatingDatasetId(datasetId);
    setFileUploadMsg("");
    try {
      const payload = {
        active_until: enrollmentWindowEnd ? new Date(enrollmentWindowEnd).toISOString() : null,
      };
      const res = await fetch(`${API_BASE}/v1/tenant-admin/datasets/${datasetId}/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setFileUploadMsg(`${data.filename}의 수강신청을 활성화했습니다.`);
      await loadSummary();
      await loadDatasets();
    } catch (err: any) {
      setFileUploadMsg(err?.message || "수강신청 활성화 중 오류가 발생했습니다.");
    } finally {
      setActivatingDatasetId(null);
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
        <div className="space-y-2">
          <label className="block text-sm font-medium">파일 업로드 (JSON · Excel · CSV)</label>
          <div className="flex flex-wrap gap-3">
            <input
              key={fileInputKey}
              type="file"
              accept=".json,.csv,.xls,.xlsx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="button"
              className="btn px-4 py-2 text-sm"
              onClick={uploadDataFile}
              disabled={uploadingFile}
            >
              {uploadingFile ? "파일 업로드 중..." : "파일로 가져오기"}
            </button>
          </div>
          <div className="text-xs text-white/60">
            선택된 파일: {selectedFile?.name || "없음"} · JSON/CSV/XLSX 자동 파싱
          </div>
          {fileUploadMsg && <div className="text-xs text-white/70">{fileUploadMsg}</div>}
        </div>
        <button className="btn" type="submit" disabled={loading}>{loading ? "업로드 중…" : "데이터 업로드"}</button>
      </form>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">업로드된 학사 데이터</h2>
            <p className="mt-1 text-sm text-white/60">
              업로드한 파일을 확인하고 특정 데이터를 수강신청 활성화 대상으로 선택할 수 있습니다.
            </p>
          </div>
          {loadingDatasets && (
            <div className="text-sm text-white/60">데이터 목록을 불러오는 중...</div>
          )}
        </div>
        {datasets.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/30 px-4 py-6 text-sm text-white/60">
            아직 파일 업로드 이력이 없습니다. 위에서 XLSX/CSV/JSON 파일을 업로드해 주세요.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {datasets.map((dataset) => {
              const summaryEntries = (dataset.summary || {}) as Record<string, number>;
              return (
                <article
                  key={dataset.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-semibold text-white">{dataset.filename}</div>
                      <div className="text-xs text-white/50">
                        업로드 {formatDeadline(dataset.uploaded_at)} · {dataset.rows}개 행 · {dataset.file_type || "확인불가"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        dataset.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                      }`}
                    >
                      {dataset.active ? "활성화" : "대기"}
                    </span>
                  </div>
                  {Object.keys(summaryEntries).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(summaryEntries).map(([name, count]) => (
                        <span key={name} className="rounded-full bg-white/10 px-2 py-1 text-xs">
                          {name} {count}
                        </span>
                      ))}
                    </div>
                  )}
                  {dataset.activated_at && (
                    <div className="text-xs text-white/60">
                      마지막 활성화 {formatDeadline(dataset.activated_at)}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="btn rounded-full px-4 py-2 text-xs"
                      onClick={() => activateDataset(dataset.id)}
                      disabled={activatingDatasetId === dataset.id}
                    >
                      {activatingDatasetId === dataset.id
                        ? "활성화 중..."
                        : dataset.active
                        ? "현재 활성화됨"
                        : "수강신청 활성화"}
                    </button>
                    <div className="text-xs text-white/60">
                      {dataset.file_type ? dataset.file_type.toUpperCase() : "유형 없음"}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {msg && <div className="text-sm text-white/70">{msg}</div>}
    </div>
  );
}
