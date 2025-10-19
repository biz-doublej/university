import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="시스템 설정"
        description={`${university} 캠퍼스의 인증, 통합 API, 배치 작업을 설정하고 모니터링합니다.`}
        details={[
          {
            title: "통합 API",
            description: "학사, 재무, LMS 등 외부 시스템과의 연계를 위한 API 키와 호출 이력을 관리합니다.",
          },
          {
            title: "배치 작업 자동화",
            description: "정기 데이터 동기화, 알림 발송 등의 예약 작업을 생성하고 상태를 추적합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
