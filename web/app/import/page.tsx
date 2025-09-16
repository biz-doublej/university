"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/v1/import/sections", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setResult(json);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">과목 섹션 CSV 업로드</h1>
      <div className="card space-y-3">
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button className="btn" disabled={!file || loading}>
            {loading ? "업로드 중…" : "업로드"}
          </button>
        </form>
        <p className="text-sm text-white/70">필수 컬럼: code, name, hours_per_week, expected_enrollment</p>
      </div>

      {error && <div className="card text-red-300">에러: {error}</div>}
      {result && (
        <div className="card">
          <div className="font-medium mb-2">검증 결과</div>
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

