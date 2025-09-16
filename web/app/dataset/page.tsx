"use client";

import { useEffect, useMemo, useState } from "react";

type DatasetResp = {
  file?: string;
  count?: number;
  columns?: string[];
  items?: any[];
  error?: string;
};

export default function DatasetPage() {
  const [data, setData] = useState<DatasetResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/dataset");
        const json = (await res.json()) as DatasetResp;
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        setData(json);
      } catch (e: any) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    if (!data?.items) return [] as any[];
    if (!q) return data.items;
    const s = q.toLowerCase();
    return data.items.filter((row) =>
      Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [data, q]);

  if (loading) return <div>로딩 중…</div>;
  if (error) return (
    <div className="space-y-3">
      <div className="card text-red-300">에러: {error}</div>
      <div className="card text-sm text-white/80">
        데이터 파일이 필요합니다. 레포 루트의 `data/` 폴더에 XLSX/CSV 파일을 넣어주세요.
        <br />예: `data/kbu.xlsx`
      </div>
    </div>
  );

  const cols = data?.columns || [];
  const labels: Record<string, string> = {
    department: "학과",
    course_code: "교과목 코드",
    course_name: "교과목명",
    grade: "학년",
    section: "분반",
    enrolled: "수강 인원",
    limit: "제한 인원",
    instructor: "담당교수",
    building: "건물",
    room: "강의실",
    timeslot: "시간표",
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">경복대학교 데이터셋 (미가공)</h1>
          {data?.file && (
            <p className="text-sm text-white/60 mt-1">원본 파일: {data.file} · 행수: {data.count}</p>
          )}
        </div>
        <input
          className="input max-w-xs"
          placeholder="검색(학과/코드/교과목명/교수)…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="overflow-auto border border-white/10 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              {cols.map((c) => {
                const label = labels[c] || c.replace(/_/g, " ");
                return (
                  <th key={c} className="text-left px-3 py-2 font-medium">
                    {label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="odd:bg-white/0 even:bg-white/5">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 whitespace-nowrap">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-white/70">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}
