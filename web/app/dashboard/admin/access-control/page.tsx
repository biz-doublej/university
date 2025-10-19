import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="권한 및 사용자 관리"
        description={`${university} 테넌트의 학생, 교수, 외부 파트너 권한을 안전하게 운영합니다.`}
        details={[
          {
            title: "역할 기반 접근제어(RBAC)",
            description: "역할·조직 단위로 권한을 부여하고, 예외 권한은 만료일과 함께 관리합니다.",
          },
          {
            title: "인증 감사",
            description: "중요 자원 접근 로그를 실시간 모니터링하고 이상 징후를 감지합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
