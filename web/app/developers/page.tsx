"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../../components/i18n";

type ListKeyItem = { id: number; name: string; key_prefix: string; key_type: string; active: boolean; created_at: string; last_used_at?: string };
type ProjectItem = { id: number; name: string; tenant_id: number; active: boolean };

export default function DevelopersPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const { t, lang } = useI18n();
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("Demo Project");
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  const [keyName, setKeyName] = useState("default");
  const [keyType, setKeyType] = useState<"api" | "ai">("api");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<ListKeyItem[]>([]);

  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem("tma_token");
    if (stored) setAuthToken(stored);
  }, []);

  const clearSession = (message?: string) => {
    localStorage.removeItem("tma_token");
    setAuthToken(null);
    setProjects([]);
    setProjectId(null);
    setKeys([]);
    setApiKey(null);
    if (message) setMsg(message);
  };

  const listKeys = async (targetProjectId?: number, tokenOverride?: string) => {
    const pid = targetProjectId ?? projectId;
    const tokenValue = tokenOverride ?? authToken;
    if (!pid || !tokenValue) return;
    const r = await fetch(`${API_BASE}/v1/dev/projects/${pid}/keys`, { headers: { Authorization: `Bearer ${tokenValue}` } });
    if (r.status === 401) {
      clearSession(t("developers.sessionExpired"));
      return;
    }
    const j: any = await r.json();
    if (r.ok && Array.isArray(j)) {
      setKeys(j.map((item: any) => ({
        id: item.id,
        name: item.name,
        key_prefix: item.key_prefix,
        key_type: item.key_type || "api",
        active: item.active,
        created_at: item.created_at,
        last_used_at: item.last_used_at,
      })));
    }
  };

  const loadProjects = async (tokenOverride?: string) => {
    const tokenValue = tokenOverride ?? authToken;
    if (!tokenValue) return;
    try {
      const r = await fetch(`${API_BASE}/v1/dev/projects`, { headers: { Authorization: `Bearer ${tokenValue}` } });
      if (r.status === 401) {
        clearSession(t("developers.sessionExpired"));
        return;
      }
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      if (Array.isArray(j)) {
        setProjects(j);
        if (j.length > 0) {
          setProjectId((prev) => {
            if (prev && j.some((p) => p.id === prev)) return prev;
            return j[0].id;
          });
        } else {
          setProjectId(null);
        }
      }
    } catch (e: any) {
      setMsg(`Project list error: ${e.message || e}`);
    }
  };

  useEffect(() => {
    if (!authToken) {
      setProjects([]);
      setProjectId(null);
      setKeys([]);
      setApiKey(null);
      return;
    }

    const tokenValue = authToken;
    const tokenHeader = `Bearer ${tokenValue}`;

    const fetchContext = async () => {
      try {
        const r = await fetch(`${API_BASE}/v1/auth/me`, { headers: { Authorization: tokenHeader } });
        if (r.status === 401) {
          clearSession(t("developers.sessionExpired"));
          return;
        }
      } catch (e: any) {
        setMsg(`Auth error: ${e?.message || e}`);
      }

      await loadProjects(tokenValue);
    };

    void fetchContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!projectId || !authToken) {
      setKeys([]);
      return;
    }
    void listKeys(projectId, authToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, authToken]);

  const createProject = async () => {
    if (!authToken) { setMsg("먼저 로그인하세요."); return; }
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/v1/dev/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: projectName }),
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setProjectId(j.id);
      await loadProjects(authToken);
      setMsg(`Project created: ${j.name} (#${j.id})`);
    } catch (e: any) {
      setMsg(`Project error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const issueKey = async () => {
    if (!projectId) { setMsg("먼저 프로젝트를 생성하세요."); return; }
    if (!authToken) { setMsg("먼저 로그인하세요."); return; }
    setLoading(true);
    setMsg("");
    setApiKey(null);
    try {
      const r = await fetch(`${API_BASE}/v1/dev/projects/${projectId}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ name: keyName, key_type: keyType }),
      });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setApiKey(j.api_key);
      const message = keyType === "ai" ? (lang === "ko" ? "AI 키가 발급되었습니다. 발급 시 1회만 평문으로 표시됩니다." : "AI key issued. It will only be shown once.") : (lang === "ko" ? "API 키가 발급되었습니다. 이 키는 발급 시 1회만 평문으로 표시됩니다." : "API key issued. It is shown only once.");
      setMsg(message);
      await listKeys(projectId, authToken);
    } catch (e: any) {
      setMsg(`Issue key error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("developers.title")}</h1>
      <div className="text-sm text-white/80">{t("developers.desc")}</div>

      {!authToken && (
        <div className="card text-sm text-white/80">{t("developers.loginPrompt")}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="font-medium">1) {t("developers.createProject")}</div>
          <div>
            <label className="block text-xs mb-1">{t("developers.projectSelect")}</label>
            <select className="input" value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t("developers.projectSelectPlaceholder")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {(!projects.length && authToken) && (
              <div className="text-xs text-white/60 mt-1">{t("developers.noProjects")}</div>
            )}
          </div>
          <input className="input" placeholder="Project name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <button className="btn w-fit" onClick={createProject} disabled={loading}>{t("developers.createProject")}</button>
          {projectId && (
            <div className="text-sm text-white/70">
              {lang === "ko" ? `선택된 프로젝트 ID: ${projectId}` : `Selected project ID: ${projectId}`}
            </div>
          )}
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div className="font-medium">2) {t("developers.issueKey")}</div>
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">{t("developers.keyName")}</label>
              <input className="input" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1">{t("developers.keyType")}</label>
              <select className="input" value={keyType} onChange={(e) => setKeyType(e.target.value as "api" | "ai")}>
                <option value="api">API</option>
                <option value="ai">AI</option>
              </select>
            </div>
            <div className="md:col-span-1">
              <button className="btn w-full" onClick={issueKey} disabled={loading || !projectId}>{t("developers.issueKey")}</button>
            </div>
          </div>
          <div className="text-xs text-white/60">
            {keyType === "ai"
              ? (lang === "ko" ? "AI 키는 승인된 학교 관리자만 발급할 수 있으며, 학생/교원 포털 연동에 사용됩니다." : "AI keys require school admin approval and activate the campus portal.")
              : (lang === "ko" ? "API 키는 통합 및 개발을 위한 일반 키입니다." : "API keys are used for integrations and development.")}
          </div>
          {apiKey && (
            <div className="text-sm">
              <div className="text-white/80">{lang === "ko" ? "발급된 키(한번만 표시):" : "Issued key (shown once):"}</div>
              <code className="block bg-white/10 p-2 rounded mt-1">{apiKey}</code>
              <div className="text-white/60 mt-1">
                {lang === "ko" ? (
                  <>헤더에 <code>X-API-Key</code> 또는 <code>Authorization: Bearer &lt;키&gt;</code>로 사용하세요.</>
                ) : (
                  <>Use it as <code>X-API-Key</code> or <code>Authorization: Bearer &lt;token&gt;</code>.</>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div className="font-medium">{t("developers.keys.name")}</div>
          <button className="btn w-fit" onClick={() => listKeys(projectId, authToken ?? undefined)} disabled={!projectId || !authToken}>{t("developers.refresh")}</button>
          <div className="overflow-auto border border-white/10 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">{t("developers.keys.id")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.name")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.type")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.prefix")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.active")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.created")}</th>
                  <th className="text-left px-3 py-2">{t("developers.keys.lastUsed")}</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="odd:bg-white/0 even:bg-white/5">
                    <td className="px-3 py-2">{k.id}</td>
                    <td className="px-3 py-2">{k.name}</td>
                    <td className="px-3 py-2 text-xs uppercase">{(k.key_type === "ai" ? "AI" : "API")}</td>
                    <td className="px-3 py-2">{k.key_prefix}</td>
                    <td className="px-3 py-2">{k.active ? (lang === "ko" ? "활성" : "Active") : (lang === "ko" ? "비활성" : "Inactive")}</td>
                    <td className="px-3 py-2">{k.created_at}</td>
                    <td className="px-3 py-2">{k.last_used_at || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!!msg && <div className="text-white/70">{msg}</div>}
    </div>
  );
}
