"use client";

import { useState } from "react";

type GeneratedKey = {
  ai_key: string;
  key_prefix: string;
  key_type: string;
  createdAt: Date;
};

type Props = {
  university: string;
};

export default function AdminAccessControlClient({ university }: Props) {
  const [keys, setKeys] = useState<GeneratedKey[]>([]);
  const [name, setName] = useState("school-portal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const issueKey = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/ai-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "AI 키를 발급하지 못했습니다.");
      }
      setKeys((prev) => [
        { ...data, createdAt: new Date() } as GeneratedKey,
        ...prev,
      ]);
      setSuccess("새로운 AI 키가 발급되었습니다.");
    } catch (err: any) {
      setError(err?.message || "AI 키 발급 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 접근 제어</h1>
        <p className="mt-3 text-sm text-white/70">
          학생, 교수, 외부 파트너에게 필요한 권한을 안전하게 부여하세요. AI 포털용 키를 발급해
          개발자에게 전달하고, 만료·회수 정책을 수립할 수 있습니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">AI 포털 키 발급</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 min-w-[220px] rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            placeholder="키 이름"
          />
          <button
            type="button"
            onClick={issueKey}
            className="btn rounded-full px-5 py-2 text-sm"
            disabled={loading}
          >
            {loading ? "발급 중..." : "AI 키 발급"}
          </button>
        </div>
        {success && (
          <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">발급 이력</h2>
        {keys.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">아직 발급된 키가 없습니다.</div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-white/80">
            {keys.map((key) => (
              <div
                key={key.key_prefix + key.createdAt.toISOString()}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-semibold text-white">{key.key_prefix}</div>
                  <div className="text-xs text-white/50">
                    {key.createdAt.toLocaleString("ko-KR")}
                  </div>
                </div>
                <div className="mt-1 text-white/70">{key.ai_key}</div>
                <div className="mt-1 text-xs text-white/50">{key.key_type.toUpperCase()} · 만료 정책은 별도 설정을 따릅니다.</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
