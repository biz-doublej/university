import DashboardShell from "../../../../components/DashboardShell";
import ProfessorEnrollmentsClient from "../../../../components/professor/ProfessorEnrollmentsClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <ProfessorEnrollmentsClient university={university} />
    </DashboardShell>
  );
}
