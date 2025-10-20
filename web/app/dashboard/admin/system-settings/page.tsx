import DashboardShell from "../../../../components/DashboardShell";
import AdminSystemSettingsClient from "../../../../components/admin/AdminSystemSettingsClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <AdminSystemSettingsClient university={university} />
    </DashboardShell>
  );
}
