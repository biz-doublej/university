import React from "react";
import DashboardTemplate from "./DashboardTemplate";

type Props = { university: string };

export default function ProfessorDashboard({ university }: Props) {
  return (
    <DashboardTemplate
      title={`${university} 교수 대시보드`}
      subtitle="Faculty Portal"
      description="강의 운영과 학생 피드백을 한 번에 확인하고, AI 기반 일정 추천으로 강의 계획을 최적화하세요."
      theme={{ primary: "#f97316", secondary: "#facc15" }}
      sections={[
        {
          title: "수강신청 현황",
          description:
            "강의별 신청 인원과 대기자 데이터를 실시간으로 파악하고, 정원 조정 요청을 빠르게 처리합니다.",
          href: "/dashboard/professor/enrollments",
        },
        {
          title: "강의 일정 관리",
          description:
            "개인/학과 일정과 연동된 교수 시간표를 확인하고, 빈 슬롯에 대한 AI 추천을 받아보세요.",
          href: "/dashboard/professor/schedule",
        },
        {
          title: "학생 피드백",
          description:
            "학생 후기와 만족도 지표를 시각화하여 교육 품질을 분석할 수 있습니다.",
          href: "/dashboard/professor/feedback",
        },
        {
          title: "과제 및 평가 계획",
          description:
            "평가 일정, 루브릭, 제출 현황 등을 한 화면에서 정리하고 공유하세요.",
          href: "/dashboard/professor/assessments",
        },
      ]}
    />
  );
}
