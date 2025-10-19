import DashboardShell from "../../../../components/DashboardShell";
import FeaturePage from "../../../../components/FeaturePage";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <FeaturePage
        heading="플랫폼 인프라 상태"
        description={`${university} 포함 전체 캠퍼스의 API, 파이프라인, 배치 작업 상태를 실시간 모니터링합니다.`}
        details={[
          {
            title: "서비스 헬스보드",
            description: "API 지연, 에러율, 큐 적체 등 주요 지표를 시각화하고, 이상 시 알림을 발송합니다.",
          },
          {
            title: "파이프라인 추적",
            description: "데이터 수집·정제·추천 모델 학습 파이프라인의 실행 내역과 재시도 상황을 추적합니다.",
          },
        ]}
      />
    </DashboardShell>
  );
}
