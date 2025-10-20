import DashboardShell from "../../../../components/DashboardShell";
import StudentInsightsClient from "../../../../components/student/StudentInsightsClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <StudentInsightsClient university={university} />
    </DashboardShell>
  );
}
