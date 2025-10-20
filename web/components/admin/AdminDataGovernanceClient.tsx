"use client";

import { useEffect, useMemo, useState } from "react";

type HeatmapCell = {
  day: string;
  time: string;
  vacancy_ratio: number;
};

const DAY_MAP: Record<string, string> = {
  Mon: "월",
  Tue: "화",
  Wed: "수",
  Thu: "목",
  Fri: "금",
};

type Props = {
  university: string;
};

export default function AdminDataGovernanceClient({ university }: Props) {
  const [cells, setCells] = useState<HeatmapCell[]>([]);
  const [building, setBuilding] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ week: "2025-01" });
        if (building) params.set("building", building);
        const res = await fetch(`/api/vacancy/heatmap?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "공실 데이터를 불러오지 못했습니다.");
        }
        setCells(data || []);
      } catch (err: any) {
        setError(err?.message || "데이터 거버넌스 정보를 가져오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [building]);

  const days = useMemo(() => Array.from(new Set(cells.map((cell) => cell.day))), [cells]);
  const times = useMemo(() => Array.from(new Set(cells.map((cell) => cell.time))).sort(), [cells]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 데이터 거버넌스</h1>
        <p className="mt-3 text-sm text-white/70">
          테넌트별 공실률을 분석해 공간 활용도를 모니터링하고, 보존 정책 및 감사 로그를
          계획할 수 있습니다. 필터를 사용해 건물별로 사용률을 확인하세요.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">공간 활용 히트맵</h2>
          <input
            type="text"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
            placeholder="건물 필터 (예: 공학관)"
            className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
          />
        </div>
        {loading && <div className="mt-3 text-sm text-white/60">데이터를 불러오는 중...</div>}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm text-white/80">
            <thead>
              <tr>
                <th className="w-24 border border-white/10 bg-white/10 px-3 py-2 text-left text-white/60">
                  시간
                </th>
                {days.map((day) => (
                  <th key={day} className="border border-white/10 bg-white/10 px-3 py-2 text-left text-white/60">
                    {DAY_MAP[day] ?? day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((time) => (
                <tr key={time}>
                  <td className="border border-white/10 px-3 py-2 text-white/50">{time}</td>
                  {days.map((day) => {
                    const cell = cells.find((c) => c.day === day && c.time === time);
                    const ratio = cell ? cell.vacancy_ratio : 0;
                    const percentage = Math.round(ratio * 100);
                    const bg = `rgba(56, 189, 248, ${0.15 + ratio * 0.6})`;
                    return (
                      <td
                        key={`${day}-${time}`}
                        className="border border-white/10 px-3 py-2"
                        style={{ backgroundColor: bg }}
                      >
                        <div className="text-xs text-white">
                          공실 {percentage}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">감사 로그 체크리스트</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <li>• AI 배정 실행 이력과 결과 설명을 보관하세요.</li>
          <li>• 공실률 70% 이상 구간은 외부 대여 후보로 태깅해 두세요.</li>
          <li>• 보존 기간이 만료된 강의실 이용 데이터는 익명화 후 보관하세요.</li>
        </ul>
      </section>
    </div>
  );
}
