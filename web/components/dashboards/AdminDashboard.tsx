import RoleDashboard from "./RoleDashboard";

type Props = { university: string };

export default function AdminDashboard({ university }: Props) {
  const stats = [
    { label: "운영 테넌트", value: "3개" },
    { label: "정책 커버리지", value: "100%" },
    { label: "가동률", value: "99.9%" },
  ];
  const sections = [
    {
      title: "수강 및 편성 통합",
      description:
        "과목 개설, 정원 조정, AI 시간표 배정까지 모든 학사 편성을 중앙에서 제어합니다.",
      actionLabel: "편성 열기",
      actionHref: "/dashboard/admin/curriculum",
    },
    {
      title: "권한 및 사용자 관리",
      description:
        "학생·교수·외부 파트너 권한을 세밀하게 설정하고 실시간 인증 로그를 확인하세요.",
      actionLabel: "권한 보기",
    },
    {
      title: "데이터 거버넌스",
      description:
        "테넌트별 정책, 보존 주기, 감사 로그를 손쉽게 생성하고 모니터링합니다.",
      actionLabel: "거버넌스 대시보드",
    },
    {
      title: "인프라 설정",
      description:
        "인증, 통합 API, 캘린더 퍼블리싱, 배치 스케줄러를 구성하고 개발자와 협업합니다.",
      actionLabel: "시스템 설정",
    },
  ];

  return (
    <RoleDashboard
      university={university}
      heroTitle="관리자 전용 포털"
      heroSubtitle="Administrator Portal"
      heroDescription="캠퍼스 전체 운영을 AI로 관찰해 정책·인프라·사용자 흐름을 안전하게 운영합니다."
      gradient={{ from: "rgba(236,72,153,0.9)", to: "rgba(59,0,255,0.6)" }}
      stats={stats}
      sections={sections}
    />
  );
}
