import DashboardShell from "../../../../components/DashboardShell";
import StudentIntegrationClient from "../../../../components/student/StudentIntegrationClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <StudentIntegrationClient university={university} />
    </DashboardShell>
  );
}
