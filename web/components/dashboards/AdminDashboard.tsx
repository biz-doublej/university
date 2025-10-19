import React from "react";
import DashboardTemplate from "./DashboardTemplate";

type Props = { university: string };

export default function AdminDashboard({ university }: Props) {
  return (
    <DashboardTemplate
      title={`${university} 관리자 대시보드`}
      subtitle="Administrator Portal"
      description="캠퍼스 운영 전반을 AI로 지원받고, 학생·교수·시설 데이터를 안전하게 관리하세요."
      theme={{ primary: "#ec4899", secondary: "#f472b6" }}
      sections={[
        {
          title: "수강 및 편성 관리",
          description:
            "과목 개설부터 정원 조정, AI 시간표 배정까지 모든 학사 편성을 중앙에서 제어합니다.",
        },
        {
          title: "권한 및 사용자 관리",
          description:
            "학생, 교수, 외부 파트너 권한을 안전하게 부여하고, 접근 기록을 모니터링합니다.",
        },
        {
          title: "데이터 거버넌스",
          description:
            "테넌트별 데이터 정책과 보존 주기를 설정하고, 감사를 위한 로그를 손쉽게 조회하세요.",
        },
        {
          title: "시스템 설정",
          description:
            "인증, 통합 API, 예약 작업 등 인프라 설정을 관리하고 개발자와 협업할 수 있습니다.",
        },
      ]}
    />
  );
}
