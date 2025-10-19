import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="수업 후기 작성"
        description={`${university} 학생이 수강한 과목에 별점과 리뷰를 남겨 추천 모델 고도화에 활용합니다.`}
        details={[
          {
            title: "간편 후기 폼",
            description: "강의 만족도, 난이도, 강사 피드백을 직관적인 스코어와 태그로 입력할 수 있습니다.",
          },
          {
            title: "AI 요약",
            description: "수집된 후기는 AI가 요약하여 교수·행정팀이 빠르게 인사이트를 확인할 수 있도록 제공합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
