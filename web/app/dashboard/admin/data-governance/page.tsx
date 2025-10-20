import DashboardShell from "../../../../components/DashboardShell";
import AdminDataGovernanceClient from "../../../../components/admin/AdminDataGovernanceClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <AdminDataGovernanceClient university={university} />
    </DashboardShell>
  );
}
