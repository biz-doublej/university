import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="데이터 거버넌스"
        description={`${university} 데이터의 보존 정책, 접근 통제, 감사 로깅을 중앙에서 관리합니다.`}
        details={[
          {
            title: "보존 정책 템플릿",
            description: "개인정보·학적·AI 모델 데이터 등 유형별 보존 기간과 암호화 정책을 설정합니다.",
          },
          {
            title: "감사 로그 뷰어",
            description: "중요 데이터 추출·다운로드 기록을 필터링하고 CSV로 내보낼 수 있습니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
