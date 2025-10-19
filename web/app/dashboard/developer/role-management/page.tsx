import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="역할 및 권한 부여"
        description={`${university} 운영팀과 협업해 개발자·관리자 권한을 체계적으로 관리합니다.`}
        details={[
          {
            title: "권한 템플릿",
            description: "운영/데이터/지원 등 역할별 권한 묶음을 구성하고 빠르게 부여·회수합니다.",
          },
          {
            title: "감사 리포트",
            description: "기간별 권한 변경 이력을 리포트로 만들어 보안 감사에 활용합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
