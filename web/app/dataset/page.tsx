"use client";

import { useEffect, useMemo, useState } from "react";

type DatasetResp = {
  file?: string;
  count?: number;
  columns?: string[];
  items?: any[];
  error?: string;
  rooms?: { items: Array<{ building: string; room_no: string; room_name: string }> };
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
  const roomItems = data?.rooms?.items || [];
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
              {cols.map((c) => (
                <th key={c} className="text-left px-3 py-2 font-medium whitespace-pre-wrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={i} className="odd:bg-white/0 even:bg-white/5">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 whitespace-pre-wrap break-words">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {roomItems.length > 0 && (
        <div className="card">
          <div className="font-medium mb-3">건물명별 강의실 목록</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">건물명</th>
                  <th className="text-left px-3 py-2">호실번호</th>
                  <th className="text-left px-3 py-2">강의실명(교육공간명)</th>
                </tr>
              </thead>
              <tbody>
                {roomItems.map((r, idx) => (
                  <tr key={`${r.building}-${r.room_no}-${idx}`} className="odd:bg-white/0 even:bg-white/5">
                    <td className="px-3 py-2 whitespace-pre-wrap break-words">{r.building}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap break-words">{r.room_no}</td>
                    <td className="px-3 py-2 whitespace-pre-wrap break-words">{r.room_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {filtered.length === 0 && (
        <div className="text-white/70">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}
