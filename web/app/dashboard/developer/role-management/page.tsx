import DashboardShell from "../../../../components/DashboardShell";
import DeveloperRoleManagementClient from "../../../../components/developer/DeveloperRoleManagementClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <DeveloperRoleManagementClient university={university} />
    </DashboardShell>
  );
}
