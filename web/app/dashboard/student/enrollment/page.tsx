import DashboardShell from "../../../../components/DashboardShell";
import EnrollmentClient from "../../../../components/student/EnrollmentClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <EnrollmentClient university={university} />
    </DashboardShell>
  );
}
