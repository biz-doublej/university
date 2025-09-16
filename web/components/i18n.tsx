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
      title: "Dashboard (MVP)",
      desc: "Check backend connectivity, upload CSV, and view basic status.",
      health: "Health Check",
      dataImport: "Data Import",
      dataImportDesc: "Upload course section CSV and validate.",
      goToImport: "Go to CSV upload",
    },
    health: {
      checking: "Checking...",
      error: "Error",
      status: "Status",
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
    dataset: {
      title: "Dataset (raw)",
      originalFile: "Original file",
      rows: "rows",
      searchPlaceholder: "Search (dept/code/course/professor)...",
      roomList: "Room list by building",
      building: "Building",
      roomNo: "Room No.",
      roomName: "Room name",
      loading: "Loading...",
      error: "Error",
      needFile1: "A data file is required. Put an XLSX/CSV file under repo-root data/.",
      needFile2: "Example: data/kbu.xlsx",
      noResults: "No results",
    },
    importPage: {
      title: "Upload Course Sections CSV",
      uploading: "Uploading...",
      upload: "Upload",
      requiredCols: "Required columns: code, name, hours_per_week, expected_enrollment",
      error: "Error",
      result: "Validation Result",
    },
    scheduler: {
      title: "Scheduler",
      desc: "Import dataset to DB and run optimization with forbidden sets / warm start / slot grouping.",
      importBtn: "Import dataset",
      seedBtn: "Seed default timeslots",
      weekLabel: "Week identifier (e.g., 2025-09)",
      solver: "Solver",
      greedy: "greedy (built-in)",
      pulp: "PuLP",
      ortools: "OR-Tools CP-SAT",
      available: "(available)",
      unavailable: "(missing)",
      slotGroup: "Slot Group",
      forbidLabel: "Forbidden Set filter",
      forbidOn: "On",
      runOptimize: "Run optimize",
      status: "Status",
      score: "Score",
      resultTitle: "Assignments",
      thead: { day: "Day", start: "Start", end: "End", course: "Course Code", room: "Room" },
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
      title: "대시보드 (MVP)",
      desc: "백엔드 연동 확인, CSV 업로드, 간단한 상태를 확인할 수 있습니다.",
      health: "헬스체크",
      dataImport: "데이터 가져오기",
      dataImportDesc: "과목 섹션 CSV를 업로드하여 유효성 검사를 수행합니다.",
      goToImport: "CSV 업로드 페이지로 이동",
    },
    health: {
      checking: "확인 중…",
      error: "에러",
      status: "상태",
    },
    nav: {
      home: "홈",
      import: "CSV 가져오기",
      scheduler: "스케줄러",
      dataset: "데이터셋",
      developers: "개발자 센터",
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
    dataset: {
      title: "데이터셋 (미가공)",
      originalFile: "원본 파일",
      rows: "행수",
      searchPlaceholder: "검색(학과/코드/교과목명/교수)…",
      roomList: "건물명별 강의실 목록",
      building: "건물명",
      roomNo: "호실번호",
      roomName: "강의실명(교육공간명)",
      loading: "로딩 중…",
      error: "에러",
      needFile1: "데이터 파일이 필요합니다. 레포 루트의 data/ 폴더에 XLSX/CSV 파일을 넣어주세요.",
      needFile2: "예: data/kbu.xlsx",
      noResults: "검색 결과가 없습니다.",
    },
    importPage: {
      title: "과목 섹션 CSV 업로드",
      uploading: "업로드 중…",
      upload: "업로드",
      requiredCols: "필수 컬럼: code, name, hours_per_week, expected_enrollment",
      error: "에러",
      result: "검증 결과",
    },
    scheduler: {
      title: "스케줄러",
      desc: "데이터셋을 DB로 가져오고, 금지조합/워밍업/슬롯그룹 기반으로 최적화를 실행합니다.",
      importBtn: "데이터셋 Import",
      seedBtn: "기본 Timeslot 시드",
      weekLabel: "주차/주 식별(예: 2025-09)",
      solver: "Solver",
      greedy: "greedy (내장)",
      pulp: "PuLP",
      ortools: "OR-Tools CP-SAT",
      available: "(사용 가능)",
      unavailable: "(미설치)",
      slotGroup: "Slot Group",
      forbidLabel: "Forbidden Set 필터",
      forbidOn: "활성화",
      runOptimize: "최적화 실행",
      status: "상태",
      score: "점수",
      resultTitle: "배정 결과",
      thead: { day: "요일", start: "시작", end: "종료", course: "과목코드", room: "강의실" },
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
