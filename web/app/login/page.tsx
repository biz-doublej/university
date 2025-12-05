"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../components/i18n";
import { getDashboardRoute, saveSession } from "../../lib/session";

export default function LoginPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      saveSession(j.token, j.user);
      router.push(getDashboardRoute(j.user.role));
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">{t("login.title")}</h1>
      <form onSubmit={onSubmit} className="space-y-3 card">
        <input className="input" placeholder={t("login.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder={t("login.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn" disabled={loading} type="submit">{t("auth.login")}</button>
        {msg && <div className="text-sm text-red-300">{msg}</div>}
      </form>
      <div className="text-sm text-white/70 mt-3">{t("login.noAccount")} <a href="/signup" className="hover:underline">{t("login.signupLink")}</a></div>
    </div>
  );
}
