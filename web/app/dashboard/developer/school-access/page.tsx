import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="학교 접속 제어"
        description={`${university}를 포함한 멀티 캠퍼스 환경에서 테넌트 전환과 접속 이력을 관리합니다.`}
        details={[
          {
            title: "즉시 전환",
            description: "테넌트 코드를 입력하거나 즐겨찾기에 등록된 캠퍼스를 클릭해 즉시 이동합니다.",
          },
          {
            title: "감사 로그",
            description: "접속한 캠퍼스, 시간, 담당자를 기록해 운영 감사에 활용합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
