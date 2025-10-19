import React from "react";
import DashboardTemplate from "./DashboardTemplate";

type Props = { university: string };

export default function StudentDashboard({ university }: Props) {
  return (
    <DashboardTemplate
      title={`${university} 학생 대시보드`}
      subtitle="Student Portal"
      description="AI 기반 개인화 서비스로 수강신청부터 시간표까지 한 화면에서 관리하세요."
      theme={{ primary: "#3b82f6", secondary: "#6366f1" }}
      sections={[
        {
          title: "수강신청",
          description:
            "개설 과목 현황을 확인하고 즉시 신청/취소할 수 있습니다. AI 추천으로 알맞은 과목을 제안합니다.",
        },
        {
          title: "일정표 확인",
          description:
            "주간 시간표와 학사 일정이 자동으로 동기화되어 개인 맞춤 일정 관리가 가능합니다.",
        },
        {
          title: "수업 후기 남기기",
          description:
            "수강한 과목에 대한 별점과 한줄 리뷰를 남기면 다음 학기 추천 모델에 활용됩니다.",
        },
        {
          title: "학습 성과 인사이트",
          description:
            "이수 현황, 잔여 학점, 필수 교과목 진행률 등 학생 맞춤 지표를 제공합니다.",
        },
      ]}
    />
  );
}
