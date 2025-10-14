"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../components/i18n";

type CatalogItem = {
  university: string;
  departments: string[];
};

export default function SignupPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Student" | "Faculty" | "Admin">("Student");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const r = await fetch(`${API_BASE}/v1/auth/catalog`);
        const j = await r.json();
        if (Array.isArray(j)) setCatalog(j);
      } catch (err: any) {
        setMsg(err?.message || String(err));
      } finally {
        setLoadingCatalog(false);
      }
    };
    void fetchCatalog();
  }, [API_BASE]);

  const departments = useMemo(() => {
    const matched = catalog.find((item) => item.university === university);
    return matched ? matched.departments : [];
  }, [catalog, university]);
  const hasCatalog = catalog.length > 0;

  useEffect(() => {
    if (!departments.includes(department)) {
      setDepartment("");
    }
  }, [departments, department]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    if (!university) {
      setMsg(t("signup.errorUniversity"));
      setLoading(false);
      return;
    }
    if ((role === "Student" || role === "Faculty") && !department) {
      setMsg(t("signup.errorDepartment"));
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          university_name: university,
          department_name: department,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      localStorage.setItem("tma_token", j.token);
      router.push("/developers");
    } catch (e: any) {
      setMsg(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">{t("signup.title")}</h1>
      <form onSubmit={onSubmit} className="space-y-3 card">
        <input className="input" placeholder={t("signup.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder={t("signup.password")} value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="space-y-1">
          <label className="block text-sm text-white/80">{t("signup.role")}</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="Student">{t("signup.roleStudent")}</option>
            <option value="Faculty">{t("signup.roleFaculty")}</option>
            <option value="Admin">{t("signup.roleAdmin")}</option>
          </select>
          <div className="text-xs text-white/50">{t("signup.roleHint")}</div>
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-white/80">{t("signup.university")}</label>
          {hasCatalog ? (
            <>
              <input
                className="input"
                list="signup-university-list"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder={loadingCatalog ? t("signup.loadingCatalog") : t("signup.selectUniversity")}
                autoComplete="off"
              />
              <datalist id="signup-university-list">
                {catalog.map((item) => (
                  <option key={item.university} value={item.university} />
                ))}
              </datalist>
            </>
          ) : (
            <input className="input" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder={t("signup.university")} />
          )}
        </div>
        {(role !== "Admin" || departments.length > 0 || !hasCatalog) && (
          <div className="space-y-1">
            <label className="block text-sm text-white/80">{t("signup.department")}</label>
            {hasCatalog ? (
              <>
                <input
                  className="input"
                  list="signup-department-list"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={university ? t("signup.selectDepartment") : t("signup.selectUniversity")}
                  disabled={!university}
                  autoComplete="off"
                />
                <datalist id="signup-department-list">
                  {departments.map((dept) => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </>
            ) : (
              <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={t("signup.department")} />
            )}
          </div>
        )}
        <button className="btn" disabled={loading} type="submit">{t("auth.signup")}</button>
        {msg && <div className="text-sm text-red-300">{msg}</div>}
      </form>
      <div className="text-sm text-white/70 mt-3">{t("signup.haveAccount")} <a href="/login" className="hover:underline">{t("signup.loginLink")}</a></div>
    </div>
  );
}
