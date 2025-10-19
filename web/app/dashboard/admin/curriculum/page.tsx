import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="수강 및 편성 관리"
        description={`${university} 행정팀이 학사 데이터를 기반으로 과목 개설과 배정을 총괄합니다.`}
        details={[
          {
            title: "AI 기반 시간표 배정",
            description: "강의실, 시간, 교수 가용성을 고려한 자동 배정으로 충돌을 최소화합니다.",
          },
          {
            title: "개설 승인 흐름",
            description: "학과에서 요청한 신규 과목을 검토하고, 승인/반려 이력을 투명하게 관리합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
