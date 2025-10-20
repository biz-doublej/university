"use client";

import { useEffect, useState } from "react";

type Summary = {
  courses: number;
  students: number;
  enrollments: number;
  reviews: number;
  ai_portal_enabled: boolean;
};

type Props = {
  university: string;
  schoolCode?: string | null;
};

const STORAGE_KEY = "developer-default-school";

export default function DeveloperCurrentSchoolClient({ university, schoolCode }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [defaultSchool, setDefaultSchool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDefaultSchool(localStorage.getItem(STORAGE_KEY));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/summary");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Summary fetch 실패");
        }
        setSummary(data as Summary);
      } catch (err: any) {
        setError(err?.message || "요약 정보를 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setAsDefault = () => {
    if (schoolCode) {
      localStorage.setItem(STORAGE_KEY, schoolCode);
      setDefaultSchool(schoolCode);
    }
  };

  const clearDefault = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDefaultSchool(null);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">현재 선택 캠퍼스</h1>
        <p className="mt-3 text-sm text-white/70">
          {university} ({schoolCode ?? "코드 없음"}) 캠퍼스의 운영 지표를 표시합니다. 기본
          캠퍼스로 저장하면 다음 접속 시 자동으로 이동합니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
          <button
            type="button"
            className="btn rounded-full px-5 py-2 text-sm"
            onClick={setAsDefault}
            disabled={!schoolCode}
          >
            기본 캠퍼스로 저장
          </button>
          {defaultSchool && (
            <button
              type="button"
              className="rounded-full border border-white/20 px-5 py-2 text-sm text-white/70 hover:bg-white/10"
              onClick={clearDefault}
            >
              기본값 해제 ({defaultSchool})
            </button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">운영 요약</h2>
        {loading ? (
          <div className="mt-3 text-sm text-white/60">데이터를 불러오는 중...</div>
        ) : summary ? (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <Metric title="과목" value={summary.courses} />
            <Metric title="학생" value={summary.students} />
            <Metric title="수강신청" value={summary.enrollments} />
            <Metric title="후기" value={summary.reviews} />
          </div>
        ) : (
          <div className="mt-3 text-sm text-white/60">요약 정보를 가져올 수 없습니다.</div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="text-xs uppercase tracking-widest text-white/50">{title}</div>
      <div className="mt-2 text-2xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
