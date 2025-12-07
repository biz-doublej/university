"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ko";

type Dict = Record<string, any>;

const DICT: Record<Lang, Dict> = {
  en: {
    layout: {
      tagline: "Lighting time with AI, running campuses efficiently",
    },
    home: {
      topLabel: "Portal access",
      heroTitle: "Sign in to Timora AI",
      heroDescription:
        "Students, faculty, and administrators land on dedicated dashboards for campus planning and learning services. Authenticate to continue.",
      heroHint: "After verifying your credentials you are routed to the dashboard that matches your role.",
      loginCta: "Login",
      signupCta: "Sign up",
      featureLabel: "Key focus areas",
      feature1Title: "Role-aware routing",
      feature1Desc: "Each login branches to the student, faculty, or admin experience without extra menus.",
      feature2Title: "Secure campus control",
      feature2Desc: "Access controls, tenant isolation, and audit evidence stay bundled with every session.",
      feature3Title: "Insight-fast landing",
      feature3Desc: "The hero dashboard is optimized for clarity—no clutter, just what the role needs first.",
      impactTitle: "Campus operations in one place",
      impactDescription: "Unified visibility keeps planners ahead of schedules, halls, and learning flows.",
      metric1Label: "Campuses connected",
      metric1Value: "1",
      metric2Label: "Roles supported",
      metric2Value: "3",
      metric3Label: "Live dashboards",
      metric3Value: "24/7",
      secondaryPrompt: "Need custom onboarding or a deeper tour?",
      secondaryHint: "Login to a campus account and the right dashboard preloads the latest briefing.",
      servicesTitle: "Connected services",
      servicesDescription: "The platform is already in sync with these campus systems.",
    },
    auth: {
      login: "Login",
      signup: "Sign up",
      logout: "Logout",
      dashboard: "My Dashboard",
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
      role: "Account type",
      roleStudent: "Student",
      roleFaculty: "Faculty",
      roleAdmin: "Administrator",
      roleHint: "Choose how you will use the platform. Students and faculty can later access personalized portals.",
      university: "University",
      department: "Department / Major",
      loadingCatalog: "Loading university list...",
      selectUniversity: "Select a university",
      selectDepartment: "Select a department",
      errorUniversity: "Please choose your university.",
      errorDepartment: "Please choose your department.",
      unsupportedUniversity: "Only Kyungbok University is supported right now.",
      haveAccount: "Already have an account?",
      loginLink: "Login",
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
    home: {
      topLabel: "접속 포털",
      heroTitle: "Timora AI 포털 로그인",
      heroDescription:
        "학생·교수·관리자는 각 역할에 맞춘 대시보드로 바로 이동합니다. 먼저 인증 절차를 완료해주세요.",
      heroHint: "아래 버튼으로 로그인하거나 회원가입하면 역할별 화면으로 자동 연결됩니다.",
      loginCta: "로그인",
      signupCta: "회원가입",
      featureLabel: "주요 포인트",
      feature1Title: "역할 중심 경로",
      feature1Desc: "로그인 한 번으로 학생/교수/관리자 화면으로 분기되어 메뉴가 간소화됩니다.",
      feature2Title: "안전한 캠퍼스 제어",
      feature2Desc: "액세스와 테넌트 분리가 세션과 묶여 감사기록까지 유지됩니다.",
      feature3Title: "바로 보는 인사이트",
      feature3Desc: "초기 화면은 군더더기 없고 해당 역할이 가장 필요로 하는 내용을 먼저 보여줍니다.",
      impactTitle: "한곳에서 캠퍼스 운영 관측",
      impactDescription: "모든 창을 하나로 통합해 스케줄·강의실·학습 흐름을 선제적으로 잡습니다.",
      metric1Label: "연결된 캠퍼스",
      metric1Value: "1개",
      metric2Label: "지원 역할",
      metric2Value: "3개",
      metric3Label: "실시간 대시보드",
      metric3Value: "24/7",
      secondaryPrompt: "맞춤 온보딩이나 데모가 필요하신가요?",
      secondaryHint: "캠퍼스 계정으로 로그인하면 해당 역할의 최신 브리핑 화면을 자동으로 불러옵니다.",
      servicesTitle: "연결된 서비스",
      servicesDescription: "다음 서비스를 통합해 이미 운영 흐름과 연동되어 있습니다.",
    },
    auth: {
      login: "로그인",
      signup: "회원가입",
      logout: "로그아웃",
      dashboard: "내 대시보드",
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
      role: "회원 유형",
      roleStudent: "학생 회원",
      roleFaculty: "교수 회원",
      roleAdmin: "관리자 회원",
      roleHint: "선택한 유형에 따라 제공되는 서비스가 달라집니다. 학생·교수 회원은 이후 전용 포털을 이용할 수 있습니다.",
      university: "대학교",
      department: "학과 / 전공",
      loadingCatalog: "대학교 목록 불러오는 중…",
      selectUniversity: "대학교를 선택하세요",
      selectDepartment: "학과를 선택하세요",
      errorUniversity: "대학교를 선택해주세요.",
      errorDepartment: "학과를 선택해주세요.",
      unsupportedUniversity: "현재는 경복대만 지원합니다.",
      haveAccount: "이미 계정이 있으신가요?",
      loginLink: "로그인",
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
