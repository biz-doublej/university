"use client";

import { useEffect, useState } from "react";

type CreateTenantResp = { id: number; name: string } | { detail?: string };
type CreateProjectResp = { id: number; tenant_id: number; name: string } | { detail?: string };
type IssueKeyResp = { api_key: string; key_prefix: string; project_id: number } | { detail?: string };
type ListKeyItem = { id: number; name: string; key_prefix: string; active: boolean; created_at: string; last_used_at?: string };

export default function DevelopersPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("Demo School");
  const [tenantId, setTenantId] = useState<number | null>(null);

  const [projectName, setProjectName] = useState("Demo Project");
  const [projectId, setProjectId] = useState<number | null>(null);

  const [keyName, setKeyName] = useState("default");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keys, setKeys] = useState<ListKeyItem[]>([]);

  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const t = localStorage.getItem("tma_token");
    if (t) setAuthToken(t);
  }, []);

  // Auth flows removed from Developers page; use header buttons

  const createTenant = async () => {
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/tenants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tenantName }) });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setTenantId(j.id);
      setMsg(`Tenant created: ${j.name} (#${j.id})`);
    } catch (e: any) {
      setMsg(`Tenant error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!authToken) { setMsg("먼저 로그인하세요."); return; }
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`${API_BASE}/v1/dev/projects`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: projectName }) });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setProjectId(j.id);
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
      const r = await fetch(`${API_BASE}/v1/dev/projects/${projectId}/keys`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: keyName }) });
      const j: any = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setApiKey(j.api_key);
      setMsg("API 키가 발급되었습니다. 이 키는 발급 시 1회만 평문으로 표시됩니다.");
      await listKeys();
    } catch (e: any) {
      setMsg(`Issue key error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const listKeys = async () => {
    if (!projectId || !authToken) return;
    const r = await fetch(`${API_BASE}/v1/dev/projects/${projectId}/keys`, { headers: { Authorization: `Bearer ${authToken}` } });
    const j: any = await r.json();
    if (r.ok && Array.isArray(j)) setKeys(j);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">개발자 센터 (Developer Center)</h1>
      <div className="text-sm text-white/80">요금제 없이 API 키를 발급받아 백엔드 API를 호출할 수 있습니다.</div>

      {!authToken && (
        <div className="card text-sm text-white/80">
          프로젝트/키 관리는 로그인이 필요합니다. 상단 우측의 Login/Sign up 버튼을 사용하세요.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* 기존 Admin 경로(선택 사용): 필요 시 사용 */}
        {/* <div className="card space-y-3">
          <div className="font-medium">(관리자) 테넌트 생성</div>
          <input className="input" placeholder="테넌트 이름" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
          <button className="btn w-fit" onClick={createTenant} disabled={loading}>테넌트 생성</button>
          {tenantId && <div className="text-sm text-white/70">생성된 테넌트 ID: {tenantId}</div>}
        </div> */}

        <div className="card space-y-3">
          <div className="font-medium">2) 프로젝트 생성</div>
          <input className="input" placeholder="프로젝트 이름" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
          <button className="btn w-fit" onClick={createProject} disabled={loading || !tenantId}>프로젝트 생성</button>
          {projectId && <div className="text-sm text-white/70">생성된 프로젝트 ID: {projectId}</div>}
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div className="font-medium">3) API 키 발급</div>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs mb-1">키 이름</label>
              <input className="input" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <button className="btn" onClick={issueKey} disabled={loading || !projectId}>API 키 발급</button>
            </div>
          </div>
          {apiKey && (
            <div className="text-sm">
              <div className="text-white/80">발급된 키(한번만 표시):</div>
              <code className="block bg-white/10 p-2 rounded mt-1">{apiKey}</code>
              <div className="text-white/60 mt-1">헤더에 <code>X-API-Key</code> 또는 <code>Authorization: Bearer &lt;키&gt;</code>로 사용하세요.</div>
            </div>
          )}
        </div>

        <div className="card space-y-3 md:col-span-2">
          <div className="font-medium">발급된 키 목록</div>
          <button className="btn w-fit" onClick={listKeys} disabled={!projectId}>새로고침</button>
          <div className="overflow-auto border border-white/10 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-left px-3 py-2">Prefix</th>
                  <th className="text-left px-3 py-2">Active</th>
                  <th className="text-left px-3 py-2">Created</th>
                  <th className="text-left px-3 py-2">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="odd:bg-white/0 even:bg-white/5">
                    <td className="px-3 py-2">{k.id}</td>
                    <td className="px-3 py-2">{k.name}</td>
                    <td className="px-3 py-2">{k.key_prefix}</td>
                    <td className="px-3 py-2">{k.active ? "활성" : "비활성"}</td>
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
