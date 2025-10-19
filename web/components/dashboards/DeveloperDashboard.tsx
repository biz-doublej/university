import React from "react";
import DashboardTemplate from "./DashboardTemplate";

type Props = { university: string; schoolCode?: string | null };

export default function DeveloperDashboard({ university, schoolCode }: Props) {
  return (
    <DashboardTemplate
      title="개발자 대시보드"
      subtitle="Developer Control Center"
      description="멀티 캠퍼스 운영과 AI 파이프라인을 총괄하는 통합 관제 화면입니다."
      theme={{ primary: "#22d3ee", secondary: "#0ea5e9" }}
      sections={[
        {
          title: "학교 접속",
          content: (
            <form
              method="get"
              action="/dashboard/developer"
              className="flex flex-col gap-3 sm:flex-row"
            >
              <input
                className="input flex-1"
                name="school"
                placeholder="학교 코드 입력"
                defaultValue={schoolCode || ""}
              />
              <button className="btn sm:w-auto" type="submit">
                접속
              </button>
            </form>
          ),
          description:
            "테넌트 코드를 입력하면 해당 캠퍼스 데이터에 즉시 접속합니다.",
          href: "/dashboard/developer/school-access",
          ctaLabel: "상세 관리",
        },
        {
          title: "현재 선택 학교",
          description: university,
          href: "/dashboard/developer/current-school",
          ctaLabel: "학교 전환",
        },
        {
          title: "플랫폼 인프라 상태",
          description:
            "API 응답 속도, 파이프라인 처리량, 배치 작업 현황 등을 실시간으로 모니터링합니다.",
          href: "/dashboard/developer/platform-status",
        },
        {
          title: "역할 및 권한 부여",
          description:
            "관리자와 운영자에게 필요한 권한을 부여하고 감사 로그를 확인하세요.",
          href: "/dashboard/developer/role-management",
        },
      ]}
    />
  );
}
