import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="과제 및 평가 계획"
        description={`${university} 교수진이 과제, 시험, 루브릭을 관리하고 학생과 공유합니다.`}
        details={[
          {
            title: "평가 템플릿",
            description: "팀 프로젝트, 실험 보고 등 평가 유형별 템플릿을 제공해 일관성 있는 피드백을 작성할 수 있습니다.",
          },
          {
            title: "제출 현황 트래킹",
            description: "과제 제출률, 지각, 미제출 학생을 실시간으로 파악하고 알림을 자동 전송합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
