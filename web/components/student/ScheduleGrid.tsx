"use client";

import { useMemo } from "react";

import type { TimetableRow } from "./types";

const DAYS = [
  { value: "Mon", label: "월" },
  { value: "Tue", label: "화" },
  { value: "Wed", label: "수" },
  { value: "Thu", label: "목" },
  { value: "Fri", label: "금" },
];

const PERIODS = Array.from({ length: 9 }, (_, i) => i + 1);

type Props = {
  rows: TimetableRow[];
  heading?: string;
};

export default function ScheduleGrid({ rows, heading }: Props) {
  const scheduleGrid = useMemo(() => {
    const grid = new Map<string, { course: string; room: string }>();
    for (const row of rows) {
      const courseName = [row.course?.code, row.course?.name]
        .filter(Boolean)
        .join(" · ")
        .trim();
      const roomName = row.room?.name
        ? `${row.room.name}${row.room.building ? ` (${row.room.building})` : ""}`
        : "미정";
      for (const slot of row.slots) {
        const key = `${slot.day}-${slot.period}`;
        grid.set(key, {
          course: courseName || "과목",
          room: roomName,
        });
      }
    }
    return grid;
  }, [rows]);

  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-inner">
      {heading ? (
        <h2 className="text-xl font-semibold text-white">{heading}</h2>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-sm text-white/80">
          <thead>
            <tr>
              <th className="w-24 border border-white/10 bg-white/10 px-3 py-2 text-left font-medium text-white/70">
                교시
              </th>
              {DAYS.map((day) => (
                <th
                  key={day.value}
                  className="border border-white/10 bg-white/10 px-3 py-2 text-left font-medium text-white/70"
                >
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period}>
                <td className="border border-white/5 px-3 py-2 text-white/60">
                  {period}교시
                  <div className="text-xs text-white/40">
                    {`${(8 + period).toString().padStart(2, "0")}:00`}
                  </div>
                </td>
                {DAYS.map((day) => {
                  const cell = scheduleGrid.get(`${day.value}-${period}`);
                  return (
                    <td
                      key={`${day.value}-${period}`}
                      className="border border-white/5 px-3 py-3 align-top"
                    >
                      {cell ? (
                        <div className="rounded-xl bg-indigo-500/20 p-2 shadow-sm shadow-indigo-500/30">
                          <div className="text-sm font-semibold text-white">
                            {cell.course}
                          </div>
                          <div className="text-xs text-white/70">{cell.room}</div>
                        </div>
                      ) : (
                        <div className="text-xs text-white/30">비어있음</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
