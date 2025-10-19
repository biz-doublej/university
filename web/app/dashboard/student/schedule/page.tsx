import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="학생 일정표"
        description={`${university} 학생의 주간 시간표와 학사 일정을 자동으로 동기화합니다.`}
        details={[
          {
            title: "주간 뷰 & 모바일 최적화",
            description: "요일별 강의, 실습, 행사 일정을 라이트웨이트 캘린더로 보여주고 모바일에서도 동일한 UX를 제공합니다.",
          },
          {
            title: "학사 일정 연동",
            description: "등록, 수강신청 변경, 휴·보강 등 학사 캘린더를 자동 배치해 일정 충돌을 예방합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
