import RoleDashboard from "./RoleDashboard";

type Props = { university: string };

export default function StudentDashboard({ university }: Props) {
  const stats = [
    { label: "진행 중 강의", value: "18개" },
    { label: "추천 시간표", value: "AI 3안" },
    { label: "별점 평균", value: "4.8/5" },
  ];
  const sections = [
    {
      title: "맞춤형 시간표 구성",
      description:
        "교강사·교시·실습실 조건을 고려한 AI 추천으로 빈틈없는 스케줄을 만듭니다.",
      actionLabel: "시간표 열기",
    },
    {
      title: "수강신청 뷰",
      description:
        "실시간 인원 현황과 AI 추천을 한 화면에서 확인하고 신청/취소를 바로 처리하세요.",
      actionLabel: "과목 보기",
    },
    {
      title: "평가 & 후기",
      description:
        "수강 후기를 남기고 학습 만족도를 평가하면 다음 학기 추천에 반영됩니다.",
      actionLabel: "후기 작성",
    },
    {
      title: "학습 진단",
      description:
        "잔여 학점, 필수 과목 진행률, 계획 대비 진척도를 AI가 요약해드립니다.",
      actionLabel: "지표 확인",
    },
  ];

  return (
    <RoleDashboard
      university={university}
      heroTitle="학생 맞춤 포털"
      heroSubtitle="Student Portal"
      heroDescription="수강신청부터 시간표, 성과 인사이트까지 AI가 학습 여정을 한 화면에 정리합니다."
      gradient={{ from: "rgba(59,130,246,0.9)", to: "rgba(99,102,241,0.6)" }}
      stats={stats}
      sections={sections}
    />
  );
}
