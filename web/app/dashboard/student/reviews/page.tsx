import DashboardShell from "../../../../components/DashboardShell";
import StudentReviewsClient from "../../../../components/student/StudentReviewsClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <StudentReviewsClient university={university} />
    </DashboardShell>
  );
}
