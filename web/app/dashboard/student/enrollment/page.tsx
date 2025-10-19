import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="수강신청 관리"
        description={`${university} 학생이 AI 추천과 함께 수강신청을 진행하는 워크플로우입니다.`}
        details={[
          {
            title: "실시간 개설 과목",
            description: "과목별 여석, 담당 교수, 강의 시간, 강의실을 한 눈에 확인하고 즉시 신청 또는 취소할 수 있습니다.",
          },
          {
            title: "AI 추천 트랙",
            description: "선이수 요건과 졸업 요건을 고려한 맞춤형 추천 커리큘럼을 제공해 안전한 학업 계획을 돕습니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
