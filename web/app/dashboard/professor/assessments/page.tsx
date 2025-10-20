import DashboardShell from "../../../../components/DashboardShell";
import ProfessorAssessmentsClient from "../../../../components/professor/ProfessorAssessmentsClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <ProfessorAssessmentsClient university={university} />
    </DashboardShell>
  );
}
