export type AuthUser = {
  id: number;
  email: string;
  tenant_id: number;
  role: string;
  university?: string | null;
  department?: string | null;
};

const TOKEN_KEY = "tma_token";
const USER_KEY = "tma_user";

const DASHBOARD_ROUTES: Record<string, string> = {
  Student: "/dashboard/student",
  Faculty: "/dashboard/professor",
  Admin: "/dashboard/admin",
};

function notifySessionChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("tma:session"));
}

export function getDashboardRoute(role?: string) {
  return DASHBOARD_ROUTES[role ?? ""] ?? "/dashboard/student";
}

export function saveSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifySessionChange();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifySessionChange();
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
