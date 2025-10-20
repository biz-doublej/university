import DashboardShell from "../../../../components/DashboardShell";
import ProfessorScheduleClient from "../../../../components/professor/ProfessorScheduleClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <ProfessorScheduleClient university={university} />
    </DashboardShell>
  );
}
