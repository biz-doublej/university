import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="수강신청 현황"
        description={`${university} 교수진이 담당 강의의 신청 데이터를 실시간으로 파악합니다.`}
        details={[
          {
            title: "정원 관리",
            description: "강의별 신청/대기 인원을 시각화하고 필요 시 정원 확대 요청을 바로 전송할 수 있습니다.",
          },
          {
            title: "재수강 · 우선권 필터",
            description: "재수강생, 우선선발 대상 등을 필터링해 공정한 수강 배분을 지원합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
