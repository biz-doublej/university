import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="학생 피드백 분석"
        description={`${university} 학생이 남긴 후기를 AI가 요약해 교육 품질 개선에 활용합니다.`}
        details={[
          {
            title: "감정 및 주제 분류",
            description: "후기를 긍정/부정/중립으로 분류하고 커리큘럼, 강의 태도 등 주요 주제를 추출합니다.",
          },
          {
            title: "개선 액션 제안",
            description: "AI가 추천하는 개선 액션과 유사 강의의 모범 사례를 비교해 확인할 수 있습니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
