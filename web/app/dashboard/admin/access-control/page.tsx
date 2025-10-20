import DashboardShell from "../../../../components/DashboardShell";
import AdminAccessControlClient from "../../../../components/admin/AdminAccessControlClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <AdminAccessControlClient university={university} />
    </DashboardShell>
  );
}
