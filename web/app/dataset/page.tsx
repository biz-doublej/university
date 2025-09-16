"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../components/i18n";

type DatasetResp = {
  file?: string;
  count?: number;
  columns?: string[];
  items?: any[];
  error?: string;
  rooms?: { items: Array<{ building: string; room_no: string; room_name: string }> };
};

export default function DatasetPage() {
  const { t } = useI18n();
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

  if (loading) return <div>{t("dataset.loading")}</div>;
  if (error) return (
    <div className="space-y-3">
      <div className="card text-red-300">{t("dataset.error")}: {error}</div>
      <div className="card text-sm text-white/80">{t("dataset.needFile1")}<br />{t("dataset.needFile2")}</div>
    </div>
  );

  const cols = data?.columns || [];
  const roomItems = data?.rooms?.items || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("dataset.title")}</h1>
          {data?.file && (
            <p className="text-sm text-white/60 mt-1">{t("dataset.originalFile")}: {data.file} · {t("dataset.rows")}: {data.count}</p>
          )}
        </div>
        <input
          className="input max-w-xs"
          placeholder={t("dataset.searchPlaceholder")}
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
          <div className="font-medium mb-3">{t("dataset.roomList")}</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">{t("dataset.building")}</th>
                  <th className="text-left px-3 py-2">{t("dataset.roomNo")}</th>
                  <th className="text-left px-3 py-2">{t("dataset.roomName")}</th>
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
        <div className="text-white/70">{t("dataset.noResults")}</div>
      )}
    </div>
  );
}
