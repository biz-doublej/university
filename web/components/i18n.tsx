"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ko";

type Dict = Record<string, any>;

const DICT: Record<Lang, Dict> = {
  en: {
    layout: {
      tagline: "Lighting time with AI, running campuses efficiently",
    },
    nav: {
      home: "Home",
      import: "Import CSV",
      scheduler: "Scheduler",
      dataset: "Dataset",
      developers: "Developers",
    },
    auth: {
      login: "Login",
      signup: "Sign up",
      logout: "Logout",
      myProjects: "My Projects",
    },
    login: {
      title: "Login",
      email: "Email",
      password: "Password",
      noAccount: "Don't have an account?",
      signupLink: "Sign up",
    },
    signup: {
      title: "Sign up",
      email: "Email",
      password: "Password (min 8 characters)",
      tenant: "Tenant (School) Name",
      haveAccount: "Already have an account?",
      loginLink: "Login",
    },
    developers: {
      title: "Developer Center",
      desc: "Issue API keys without a plan.",
      loginPrompt: "Login is required to manage projects and keys. Use the Login/Sign up buttons in the top-right.",
      createProject: "Create Project",
      issueKey: "Issue API Key",
      keyName: "Key name",
      refresh: "Refresh",
      keys: {
        id: "ID",
        name: "Name",
        prefix: "Prefix",
        active: "Active",
        created: "Created",
        lastUsed: "Last Used",
      },
    },
    footer: {
      language: "Language",
      companyInfo: "Company information coming soon",
    },
  },
  ko: {
    layout: {
      tagline: "시간을 밝히는 AI, 캠퍼스를 효율적으로",
    },
    nav: {
      home: "Home",
      import: "Import CSV",
      scheduler: "Scheduler",
      dataset: "Dataset",
      developers: "Developers",
    },
    auth: {
      login: "로그인",
      signup: "회원가입",
      logout: "로그아웃",
      myProjects: "내 프로젝트",
    },
    login: {
      title: "로그인",
      email: "이메일",
      password: "비밀번호",
      noAccount: "계정이 없으신가요?",
      signupLink: "회원가입",
    },
    signup: {
      title: "회원가입",
      email: "이메일",
      password: "비밀번호(8자 이상)",
      tenant: "테넌트(학교) 이름",
      haveAccount: "이미 계정이 있으신가요?",
      loginLink: "로그인",
    },
    developers: {
      title: "개발자 센터",
      desc: "요금제 없이 API 키를 발급받아 백엔드 API를 호출할 수 있습니다.",
      loginPrompt: "프로젝트/키 관리는 로그인이 필요합니다. 상단 우측의 Login/Sign up 버튼을 사용하세요.",
      createProject: "프로젝트 생성",
      issueKey: "API 키 발급",
      keyName: "키 이름",
      refresh: "새로고침",
      keys: {
        id: "ID",
        name: "Name",
        prefix: "Prefix",
        active: "Active",
        created: "Created",
        lastUsed: "Last Used",
      },
    },
    footer: {
      language: "언어",
      companyInfo: "회사 관련 정보는 추후 제공됩니다",
    },
  },
};

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "en" || saved === "ko") setLang(saved);
  }, []);
  const t = useMemo(() => (path: string) => {
    const parts = path.split(".");
    let cur: any = DICT[lang];
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) cur = cur[p];
      else return path;
    }
    return typeof cur === "string" ? cur : path;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang: (l: Lang) => { setLang(l); if (typeof window !== "undefined") localStorage.setItem("lang", l); }, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

