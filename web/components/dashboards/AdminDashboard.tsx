/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import RoleDashboard from "./RoleDashboard";

type Props = { university: string };

type Summary = {
  courses: number;
  students: number;
  enrollments: number;
  reviews: number;
};

export default function AdminDashboard({ university }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [fixedSummary, setFixedSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/summary");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "요약 정보를 불러오지 못했습니다.");
        }
        setSummary({
          courses: data.courses ?? 0,
          students: data.students ?? 0,
          enrollments: data.enrollments ?? 0,
          reviews: data.reviews ?? 0,
        });
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
            return;
          }
        } catch {
          // ignore
        }
        setError(err?.message || "요약 정보를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = useMemo(() => {
    const base = summary || fixedSummary || { courses: 0, students: 0, enrollments: 0, reviews: 0 };
    return [
      { label: "개설 과목", value: base.courses.toLocaleString() },
      { label: "등록 학생", value: base.students.toLocaleString() },
      { label: "수강신청", value: base.enrollments.toLocaleString() },
    ];
  }, [summary, fixedSummary]);

  const sections = [
    {
      title: "데이터 확인",
      description: "학과·강의·공실 데이터를 한눈에 확인해 정보 정확도를 유지합니다.",
      actionLabel: "데이터 보기",
      actionHref: "/tenant-admin",
    },
    {
      title: "AI 학과 공실 배정",
      description: "고정 데이터를 기반으로 학과별 공실을 예측하고 활용도를 최적화합니다.",
      actionLabel: "공실 배정 확인",
      actionHref: "/dashboard/admin/data-governance",
    },
    {
      title: "AI 학과 시간표 배정",
      description: "AI가 영역·학과·강의실 조건을 고려해 시간표를 자동으로 배정합니다.",
      actionLabel: "편성 실행",
      actionHref: "/dashboard/admin/curriculum",
    },
  ];

  const quickActions = [
    { label: "데이터 대시보드", href: "/tenant-admin" },
    { label: "공실 히트맵", href: "/dashboard/admin/data-governance" },
    { label: "AI 편성 실행", href: "/dashboard/admin/curriculum" },
  ];

  const vizData = [
    { label: "개설 과목", value: summary?.courses ?? fixedSummary?.courses ?? 0 },
    { label: "등록 학생", value: summary?.students ?? fixedSummary?.students ?? 0 },
    { label: "수강신청", value: summary?.enrollments ?? fixedSummary?.enrollments ?? 0 },
    { label: "수업 후기", value: summary?.reviews ?? fixedSummary?.reviews ?? 0 },
  ];
  const maxValue = Math.max(...vizData.map((item) => item.value), 1);

  return (
    <div className="space-y-8">
      <RoleDashboard
        university={university}
        heroTitle="관리자 전용 포털"
        heroSubtitle="Administrator Portal"
        heroDescription="캠퍼스 전체 운영을 AI로 관찰해 정책·인프라·사용자 흐름을 안전하게 운영합니다."
        gradient={{ from: "rgba(236,72,153,0.9)", to: "rgba(59,0,255,0.6)" }}
        stats={stats}
        sections={sections}
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">바로 가기</h2>
            <p className="text-sm text-white/60">주요 관리자 기능을 즉시 실행할 수 있습니다.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-full border border-white/10 bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">실시간 학과 데이터 시각화</h2>
            <p className="text-sm text-white/60">고정 데이터와 최신 AI 배정 결과를 조합해 학사 지표를 표시합니다.</p>
          </div>
          {loading && <div className="text-xs text-white/60">업데이트 중...</div>}
        </div>
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100">
            {error}
          </div>
        )}
        <div className="mt-4 space-y-4">
          {vizData.map((item) => {
            const ratio = Math.max(0, Math.min(1, item.value / maxValue));
            return (
              <div key={item.label}>
                <div className="flex items-center justify-between text-sm text-white/80">
                  <span>{item.label}</span>
                  <span className="font-semibold text-white">{item.value.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-500"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
