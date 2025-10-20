"use client";

import { useEffect, useState } from "react";

type RoleEntry = {
  email: string;
  role: string;
  expiresAt?: string;
};

type Props = {
  university: string;
};

const STORAGE_KEY = "developer-role-matrix";
const ROLES = ["Admin", "Manager", "Faculty", "Student", "Viewer"];

export default function DeveloperRoleManagementClient({ university }: Props) {
  const [entries, setEntries] = useState<RoleEntry[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [expiresAt, setExpiresAt] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = () => {
    if (!email.trim()) return;
    const entry: RoleEntry = {
      email: email.trim(),
      role,
      expiresAt: expiresAt || undefined,
    };
    setEntries((prev) => [entry, ...prev.filter((item) => item.email !== entry.email)]);
    setEmail("");
    setExpiresAt("");
  };

  const removeEntry = (target: string) => {
    setEntries((prev) => prev.filter((item) => item.email !== target));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 역할/권한 관리</h1>
        <p className="mt-3 text-sm text-white/70">
          운영/데이터/지원 등 역할별 권한 묶음을 정의하고, 만료일을 설정해 자동 회수 정책을
          구성하세요. 현재는 로컬 시뮬레이션이지만 API 연동 구조와 동일하게 설계되어 있습니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">역할 부여</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="사용자 이메일"
            className="rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
            className="rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
          />
          <div className="md:col-span-3">
            <button type="button" className="btn rounded-full px-5 py-2 text-sm" onClick={addEntry}>
              역할 부여
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">권한 테이블</h2>
        {entries.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">권한이 등록되지 않았습니다.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm text-white/80">
              <thead>
                <tr className="bg-white/5 text-white/60">
                  <th className="px-4 py-2 text-left">사용자</th>
                  <th className="px-4 py-2 text-left">역할</th>
                  <th className="px-4 py-2 text-left">만료일</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.email} className="border-t border-white/10">
                    <td className="px-4 py-2 text-white">{entry.email}</td>
                    <td className="px-4 py-2">{entry.role}</td>
                    <td className="px-4 py-2">{entry.expiresAt ?? "-"}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.email)}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
