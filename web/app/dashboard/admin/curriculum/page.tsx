import DashboardShell from "../../../../components/DashboardShell";
import AdminCurriculumClient from "../../../../components/admin/AdminCurriculumClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <AdminCurriculumClient university={university} />
    </DashboardShell>
  );
}
