import DashboardShell from "../../../../components/DashboardShell";
import ProfessorFeedbackClient from "../../../../components/professor/ProfessorFeedbackClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <ProfessorFeedbackClient university={university} />
    </DashboardShell>
  );
}
