import RoleDashboard from "./RoleDashboard";

type Props = { university: string };

export default function ProfessorDashboard({ university }: Props) {
  const stats = [
    { label: "강의 관리", value: "12건" },
    { label: "평가 히트맵", value: "98%" },
    { label: "피드백", value: "4.6/5" },
  ];
  const sections = [
    {
      title: "강의 운영 대시보드",
      description:
        "현재 개설된 강의, 정원 현황, 수강신청 추이를 실시간으로 모니터링합니다.",
      actionLabel: "강의 보기",
    },
    {
      title: "일정 자동 조정",
      description:
        "AI는 교수 일정, 학과 캘린더, 실습실 여유를 고려하여 최적의 강의 시간을 추천합니다.",
      actionLabel: "추천 일정 보기",
    },
    {
      title: "학생 피드백 분석",
      description:
        "수업 만족도와 질의 응답 통계를 시각화해 교육 개선 포인트를 제시합니다.",
      actionLabel: "피드백 확인",
    },
    {
      title: "과제·평가 관리",
      description:
        "과제, 루브릭, 성적 마감일을 공유하고 자동 리마인더를 설정해 둡니다.",
      actionLabel: "평가 계획",
    },
  ];

  return (
    <RoleDashboard
      university={university}
      heroTitle="교수 맞춤 포털"
      heroSubtitle="Faculty Portal"
      heroDescription="강의·학생·커뮤니케이션 흐름을 AI로 연결해 보다 집중된 수업 운영이 가능합니다."
      gradient={{ from: "rgba(248,113,113,0.9)", to: "rgba(251,191,36,0.6)" }}
      stats={stats}
      sections={sections}
    />
  );
}
