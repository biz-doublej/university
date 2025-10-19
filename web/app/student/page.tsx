"use client";

import { useEffect, useMemo, useState } from "react";

type StudentProfile = {
  id: number;
  name: string;
  major?: string | null;
  year?: number | null;
  email?: string | null;
  metadata: Record<string, unknown>;
};

type EnrollmentItem = {
  id: number;
  course_id: number;
  course_code?: string | null;
  course_name?: string | null;
  status: string;
  term?: string | null;
  created_at: string;
};

type CourseRecommendation = {
  course_id: number;
  course_code?: string | null;
  course_name: string;
  score: number;
  reasons: string[];
  average_rating?: number | null;
  review_summary: { summary: string; sentiment: string; score?: number | null; sample_count?: number | null };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function StudentPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setRecommendations([]);
      setEnrollments([]);
      return;
    }

    const authHeader = { Authorization: `Bearer ${token}` };
    const run = async () => {
      try {
        setLoading(true);
        const [profileResp, recResp, enrResp] = await Promise.all([
          fetch(`${API_BASE}/v1/student/profile`, { headers: authHeader }),
          fetch(`${API_BASE}/v1/student/recommendations`, { headers: authHeader }),
          fetch(`${API_BASE}/v1/student/enrollments`, { headers: authHeader }),
        ]);
        if (profileResp.status === 401) {
          localStorage.removeItem("tma_token");
          setToken(null);
          setMsg("세션이 만료되었습니다. 다시 로그인하세요.");
          return;
        }
        const profileJson = await profileResp.json();
        setProfile(profileJson);
        const recJson = await recResp.json();
        if (Array.isArray(recJson)) setRecommendations(recJson);
        const enrJson = await enrResp.json();
        if (Array.isArray(enrJson)) setEnrollments(enrJson);
        setMsg("");
      } catch (err: any) {
        setMsg(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [token]);

  const sentimentColor = useMemo(() => ({
    delight: "text-emerald-300",
    positive: "text-teal-200",
    mixed: "text-amber-300",
    negative: "text-rose-300",
    neutral: "text-white/60",
  }), []);

  if (!token) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">학생 포털 (베타)</h1>
        <p className="text-white/70">이 페이지는 로그인한 학생만 접근할 수 있습니다. 상단 우측 Login 버튼을 사용해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">학생 포털 (베타)</h1>
        <p className="text-white/70">개인 전공과 후기 기반 추천, 수강신청 현황, 강의 후기를 확인할 수 있습니다.</p>
      </div>

      {profile && (
        <div className="card space-y-1">
          <div className="font-medium">내 학사 정보</div>
          <div className="text-sm text-white/80">{profile.name}</div>
          <div className="text-sm text-white/60">{profile.email}</div>
          <div className="text-sm text-white/70">전공: {profile.major ?? "미등록"}</div>
          <div className="text-sm text-white/70">학년: {profile.year ?? "미등록"}</div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">추천 강의</h2>
          <button
            className="btn text-xs"
            onClick={async () => {
              if (!token) return;
              setLoading(true);
              try {
                const r = await fetch(`${API_BASE}/v1/student/recommendations`, { headers: { Authorization: `Bearer ${token}` } });
                const j = await r.json();
                if (Array.isArray(j)) setRecommendations(j);
              } catch (err: any) {
                setMsg(err?.message || String(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            새로고침
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn"
            onClick={async () => {
              if (!token) return;
              setLoading(true);
              try {
                const body = { student_id: profile?.id };
                const r = await fetch(`${API_BASE}/v1/timetable/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
                const j = await r.json();
                setMsg(`추천 시간표 생성 완료: ${j.stats?.assignment_count || 0} 개 배정`);
              } catch (err: any) {
                setMsg(err?.message || String(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            나만의 시간표 생성
          </button>
          <button
            className="btn"
            onClick={async () => {
              if (!token) return;
              if (!recommendations.length) {
                setMsg('추천 강의가 없습니다. 먼저 새로고침 하세요.');
                return;
              }
              // auto-enroll top recommendation
              const top = recommendations[0];
              setLoading(true);
              try {
                const payload = { course_id: top.course_id, status: 'requested' };
                const r = await fetch(`${API_BASE}/v1/student/auto-enroll`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
                const j = await r.json();
                setEnrollments((s) => [j, ...s]);
                setMsg('자동 수강신청 요청이 생성되었습니다.');
              } catch (err: any) {
                setMsg(err?.message || String(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            추천 자동수강 신청 (Top1)
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {recommendations.map((rec) => (
            <div key={rec.course_id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{rec.course_name}</div>
                  <div className="text-xs text-white/60">{rec.course_code}</div>
                </div>
                <div className="text-sm text-white/70">점수 {rec.score.toFixed(2)}</div>
              </div>
              <ul className="text-xs text-white/70 space-y-1 list-disc list-inside">
                {rec.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <div className={`text-xs ${sentimentColor[rec.review_summary.sentiment as keyof typeof sentimentColor] || "text-white/70"}`}>
                {rec.review_summary.summary}
              </div>
            </div>
          ))}
          {!recommendations.length && (
            <div className="card text-sm text-white/60">추천 데이터가 아직 없습니다. 관리자에게 학사 데이터를 업로드하도록 요청하세요.</div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">수강신청 현황</h2>
        <div className="overflow-auto border border-white/10 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-3 py-2">과목 코드</th>
                <th className="text-left px-3 py-2">강의명</th>
                <th className="text-left px-3 py-2">상태</th>
                <th className="text-left px-3 py-2">학기</th>
                <th className="text-left px-3 py-2">신청 일시</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((en) => (
                <tr key={en.id} className="odd:bg-white/0 even:bg-white/5">
                  <td className="px-3 py-2">{en.course_code || "-"}</td>
                  <td className="px-3 py-2">{en.course_name || "-"}</td>
                  <td className="px-3 py-2">{en.status}</td>
                  <td className="px-3 py-2">{en.term || "-"}</td>
                  <td className="px-3 py-2">{new Date(en.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {!enrollments.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-white/60">아직 신청한 강의가 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {msg && <div className="text-sm text-rose-300">{msg}</div>}
      {loading && <div className="text-sm text-white/60">불러오는 중…</div>}
    </div>
  );
}
