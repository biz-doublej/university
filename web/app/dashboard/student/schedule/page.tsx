import DashboardShell from "../../../../components/DashboardShell";
import StudentScheduleClient from "../../../../components/student/StudentScheduleClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <StudentScheduleClient university={university} />
    </DashboardShell>
  );
}
