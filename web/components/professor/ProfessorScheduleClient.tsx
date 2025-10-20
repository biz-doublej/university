"use client";

import { FormEvent, useState } from "react";

type VacancyItem = {
  room_id: number;
  room_name: string;
  building?: string | null;
  capacity?: number;
};

const DAYS = [
  { value: "Mon", label: "월" },
  { value: "Tue", label: "화" },
  { value: "Wed", label: "수" },
  { value: "Thu", label: "목" },
  { value: "Fri", label: "금" },
];

type Props = {
  university: string;
};

export default function ProfessorScheduleClient({ university }: Props) {
  const [day, setDay] = useState("Mon");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [building, setBuilding] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VacancyItem[]>([]);
  const [totalRooms, setTotalRooms] = useState<number | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ day, start, end });
      if (building) params.set("building", building);
      const res = await fetch(`/api/vacancy/available?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "공실 정보를 불러오지 못했습니다.");
      }
      setResults(data.items ?? []);
      setTotalRooms(typeof data.total === "number" ? data.total : null);
    } catch (err: any) {
      setError(err?.message || "공실 정보를 조회하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 강의 일정 관리</h1>
        <p className="mt-3 text-sm text-white/70">
          결강·보강, 대체강의가 필요한 경우 즉시 사용 가능한 강의실과 시간대를 검색해 AI
          추천에 반영할 수 있습니다. 공실 데이터는 실시간으로 동기화됩니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">대체 강의실 검색</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleSearch}>
          <label className="text-sm font-medium text-white/70">
            요일
            <select
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-white/70">
            시작
            <input
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              step={1800}
            />
          </label>
          <label className="text-sm font-medium text-white/70">
            종료
            <input
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              step={1800}
            />
          </label>
          <label className="text-sm font-medium text-white/70">
            건물 (선택)
            <input
              type="text"
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              placeholder="예: 공학관"
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="btn rounded-full px-5 py-2 text-sm"
              disabled={loading}
            >
              {loading ? "검색 중..." : "공실 검색"}
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">가능한 대체 강의실</h2>
          {totalRooms !== null && (
            <span className="text-sm text-white/60">총 {totalRooms}개 중 {results.length}개 사용 가능</span>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {results.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/60">
              조건에 맞는 공실이 없습니다. 시간대를 조정하거나 건물 필터를 제거해 보세요.
            </div>
          ) : (
            results.map((item) => (
              <div
                key={item.room_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
              >
                <div>
                  <div className="font-semibold text-white">{item.room_name}</div>
                  <div className="text-xs text-white/50">
                    {item.building || "건물 정보 없음"} · 정원 {item.capacity ?? "-"}명
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-1 text-xs text-white/70 hover:bg-white/10"
                  onClick={() => navigator.clipboard.writeText(`${item.room_name} (${item.building ?? ""})`)}
                >
                  정보 복사
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
