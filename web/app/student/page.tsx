import EnrollmentClient from "../../components/student/EnrollmentClient";
import { getUniversityNameFromData } from "../../lib/getUniversityName";

export default async function StudentPortalPage() {
  const university = await getUniversityNameFromData("경복대학교 남양주 캠퍼스");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{university} 학생 수강신청 포털</h1>
        <p className="text-white/70">
          학과별 활성화 상태를 반영해 수강신청과 AI 시간표를 확인할 수 있습니다.
        </p>
      </div>
      <EnrollmentClient university={university} />
    </div>
  );
}
