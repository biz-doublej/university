import React from "react";
import DashboardShell from "../../../components/DashboardShell";
import AdminDashboard from "../../../components/dashboards/AdminDashboard";
import { getUniversityNameFromData } from "../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <AdminDashboard university={university} />
    </DashboardShell>
  );
}
