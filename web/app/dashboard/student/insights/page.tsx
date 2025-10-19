import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="학습 성과 인사이트"
        description={`${university} 학생의 이수 현황과 맞춤형 경로를 시각화해 학업 목표 달성을 지원합니다.`}
        details={[
          {
            title: "졸업 요건 트래킹",
            description: "전공·교양·자유 선택학점의 충족 여부를 카드형 지표로 보여주고 부족한 영역을 제안합니다.",
          },
          {
            title: "AI 학습 코칭",
            description: "성적 추이와 관심 분야를 기반으로 다음 학기에 추천할 과목과 비교 지표를 제공합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
