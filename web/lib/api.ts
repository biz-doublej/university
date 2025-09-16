const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const TENANT = process.env.NEXT_PUBLIC_TENANT_ID || "demo";

export function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("X-Tenant-ID")) headers.set("X-Tenant-ID", TENANT);
  return fetch(`${BASE}${path}`, { ...init, headers });
}

