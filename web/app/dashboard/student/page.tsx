import React from "react";
import DashboardShell from "../../../components/DashboardShell";
import StudentDashboard from "../../../components/dashboards/StudentDashboard";
import { getUniversityNameFromData } from "../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <StudentDashboard university={university} />
    </DashboardShell>
  );
}
