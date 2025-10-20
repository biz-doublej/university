"use client";

import { FormEvent, useState } from "react";

type Props = {
  university: string;
  schoolCode?: string | null;
};

export default function DeveloperSchoolAccessClient({ university, schoolCode }: Props) {
  const [code, setCode] = useState(schoolCode ?? "");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendLog = (message: string) => {
    setLog((prev) => [new Date().toLocaleTimeString("ko-KR") + " · " + message, ...prev].slice(0, 20));
  };

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "seed_minimum 실행 실패");
      }
      appendLog(`seed_minimum: ${JSON.stringify(data.created)}`);
    } catch (err: any) {
      setError(err?.message || "데이터 시드 중 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/clear-assignments", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "clear_assignments 실행 실패");
      }
      appendLog(`clear_assignments: cleared=${data.cleared}`);
    } catch (err: any) {
      setError(err?.message || "배정 초기화 중 오류");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (code) params.set("school", code);
    else params.delete("school");
    const href = `${window.location.pathname}?${params.toString()}`;
    window.location.href = href;
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 개발자 캠퍼스 접근</h1>
        <p className="mt-3 text-sm text-white/70">
          테넌트 코드를 입력하면 해당 캠퍼스 데이터를 즉시 확인할 수 있습니다. seed 작업으로
          기본 강의실/시간표 데이터를 생성한 뒤, 자동 배정을 재현하세요.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <form className="flex flex-wrap items-center gap-3" onSubmit={handleSubmit}>
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="학교 코드 입력"
            className="flex-1 min-w-[240px] rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
          />
          <button type="submit" className="btn rounded-full px-5 py-2 text-sm">
            캠퍼스 이동
          </button>
        </form>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSeed}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            disabled={loading}
          >
            seed_minimum 실행
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
            disabled={loading}
          >
            clear_assignments
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">작업 로그</h2>
        {log.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">실행된 작업이 없습니다.</div>
        ) : (
          <ul className="mt-3 space-y-2 text-xs text-white/70">
            {log.map((line, index) => (
              <li key={`${line}-${index}`} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
