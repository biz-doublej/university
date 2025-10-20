import DashboardShell from "../../../../components/DashboardShell";
import DeveloperPlatformStatusClient from "../../../../components/developer/DeveloperPlatformStatusClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <DeveloperPlatformStatusClient university={university} />
    </DashboardShell>
  );
}
