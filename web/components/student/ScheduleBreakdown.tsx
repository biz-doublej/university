"use client";

import { useMemo } from "react";

import type { TimetableBreakdownEntry } from "./types";

type Props = {
  title: string;
  entries: TimetableBreakdownEntry[];
  hint?: string;
};

export default function ScheduleBreakdown({ title, entries, hint }: Props) {
  const { maxCourseCount, totalSlots } = useMemo(() => {
    let maxCount = 0;
    let slots = 0;
    for (const entry of entries) {
      if (entry.course_count > maxCount) {
        maxCount = entry.course_count;
      }
      slots += entry.slot_count;
    }
    return {
      maxCourseCount: maxCount || 1,
      totalSlots: slots,
    };
  }, [entries]);

  if (!entries.length) {
    return (
      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {hint && <p className="mt-2 text-sm text-white/60">{hint}</p>}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
          아직 분류 가능한 데이터가 없습니다.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {hint && <p className="mt-1 text-sm text-white/60">{hint}</p>}
        </div>
        <div className="text-xs text-white/50">
          총 {entries.length}개 그룹 · 블록 {totalSlots}개
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {entries.map((entry) => {
          const ratio = Math.min(1, entry.course_count / maxCourseCount);
          return (
            <article
              key={entry.label}
              className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-lg font-semibold text-white">{entry.label}</div>
                <div className="text-xs text-white/50">
                  과목 {entry.course_count}개 · 블록 {entry.slot_count}개
                </div>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-indigo-400"
                  style={{ width: `${Math.max(ratio * 100, 6)}%` }}
                />
              </div>
              <div className="text-xs text-white/40">
                {entry.courses
                  .map((course) => course.course?.name || course.course?.code || "과목")
                  .join(", ")}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
