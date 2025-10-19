import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="현재 선택 학교"
        description={`${university}에 대한 관리 세부 정보를 확인하고 기본 캠퍼스로 고정합니다.`}
        details={[
          {
            title: "캠퍼스 프로필",
            description: "학교 기본 정보, 학사 일정, 주요 담당자 연락처를 한 화면에서 확인합니다.",
          },
          {
            title: "기본 캠퍼스 설정",
            description: "자주 사용하는 캠퍼스를 기본값으로 지정하고, 팀 단위 즐겨찾기 리스트를 공유합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
