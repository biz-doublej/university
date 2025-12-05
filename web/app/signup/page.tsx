"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "../../components/i18n";
import { getDashboardRoute, saveSession } from "../../lib/session";

type CatalogItem = {
  university: string;
  departments: string[];
};

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const CHOSUNG = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

const toChosung = (text: string) =>
  Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= HANGUL_BASE && code <= HANGUL_END) {
        const choIndex = Math.floor((code - HANGUL_BASE) / 588);
        return CHOSUNG[choIndex] || char;
      }
      return char;
    })
    .join("");

const matchesQuery = (target: string, query: string) => {
  if (!query) return true;
  const normTarget = target.toLowerCase();
  const normQuery = query.toLowerCase();
  if (normTarget.includes(normQuery)) return true;
  const targetChosung = toChosung(target);
  const queryChosung = toChosung(query);
  return targetChosung.includes(queryChosung);
};

export default function SignupPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"Student" | "Faculty" | "Admin">("Student");
  const [university, setUniversity] = useState("");
  const [universityInput, setUniversityInput] = useState("");
  const [showUniversityList, setShowUniversityList] = useState(false);
  const [department, setDepartment] = useState("");
  const [departmentInput, setDepartmentInput] = useState("");
  const [showDepartmentList, setShowDepartmentList] = useState(false);
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

  useEffect(() => {
    setUniversityInput(university);
  }, [university]);

  useEffect(() => {
    setDepartmentInput(department);
  }, [department]);

  const departments = useMemo(() => {
    const matched = catalog.find((item) => item.university === university);
    return matched ? matched.departments : [];
  }, [catalog, university]);
  const hasCatalog = catalog.length > 0;

  const filteredUniversities = useMemo(() => {
    if (!hasCatalog) return [];
    const query = universityInput.trim();
    return catalog
      .filter((item) => matchesQuery(item.university, query))
      .slice(0, 100)
      .map((item) => item.university);
  }, [catalog, hasCatalog, universityInput]);

  const filteredDepartments = useMemo(() => {
    if (!hasCatalog) return [];
    const query = departmentInput.trim();
    return departments
      .filter((dept) => matchesQuery(dept, query))
      .slice(0, 100);
  }, [departments, departmentInput, hasCatalog]);

  const handleUniversityBlur = () => {
    setTimeout(() => setShowUniversityList(false), 120);
  };

  const handleDepartmentBlur = () => {
    setTimeout(() => setShowDepartmentList(false), 120);
  };

  useEffect(() => {
    if (!showDepartmentList && department && !departments.includes(department)) {
      setDepartment("");
      setDepartmentInput("");
    }
  }, [departments, department, showDepartmentList]);

  useEffect(() => {
    if (!university) {
      setShowDepartmentList(false);
    }
  }, [university]);

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
            <div className="relative" onBlur={handleUniversityBlur}>
              <input
                className="input"
                value={universityInput}
                onFocus={() => setShowUniversityList(true)}
                onChange={(e) => {
                  const value = e.target.value;
                  setUniversityInput(value);
                  setUniversity(value);
                  setDepartment("");
                  setDepartmentInput("");
                }}
                placeholder={loadingCatalog ? t("signup.loadingCatalog") : t("signup.selectUniversity")}
                autoComplete="off"
              />
              {showUniversityList && filteredUniversities.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-white/15 bg-[#111727] text-sm shadow-lg">
                  {filteredUniversities.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-white/10"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setUniversity(name);
                        setUniversityInput(name);
                        setDepartment("");
                        setDepartmentInput("");
                        setShowUniversityList(false);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <input className="input" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder={t("signup.university")} />
          )}
        </div>
        {(role !== "Admin" || departments.length > 0 || !hasCatalog) && (
          <div className="space-y-1">
            <label className="block text-sm text-white/80">{t("signup.department")}</label>
            {hasCatalog ? (
              <div className="relative" onBlur={handleDepartmentBlur}>
                <input
                  className="input"
                  value={departmentInput}
                  onFocus={() => university && setShowDepartmentList(true)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDepartmentInput(value);
                    setDepartment(value);
                  }}
                  placeholder={university ? t("signup.selectDepartment") : t("signup.selectUniversity")}
                  disabled={!university}
                  autoComplete="off"
                />
                {showDepartmentList && university && filteredDepartments.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-white/15 bg-[#111727] text-sm shadow-lg">
                    {filteredDepartments.map((dept) => (
                      <button
                        key={dept}
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-white/10"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setDepartment(dept);
                          setDepartmentInput(dept);
                          setShowDepartmentList(false);
                        }}
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
