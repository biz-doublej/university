import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="강의 일정 관리"
        description={`${university} 교수용 시간표를 학과 일정과 동기화하여 공강 관리와 대체 강의 계획을 지원합니다.`}
        details={[
          {
            title: "AI 대체 강의 제안",
            description: "결강 또는 휴강이 발생하면 가능한 보강 시간과 강의실을 자동 추천합니다.",
          },
          {
            title: "공유 일정",
            description: "조교·공동강의자와 일정을 공유하고 팀티칭 강의의 일정을 한 곳에서 조율합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
