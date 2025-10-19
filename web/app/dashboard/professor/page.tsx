import React from "react";
import DashboardShell from "../../../components/DashboardShell";
import ProfessorDashboard from "../../../components/dashboards/ProfessorDashboard";
import { getUniversityNameFromData } from "../../../lib/getUniversityName";

export default async function Page() {
  const university = await getUniversityNameFromData();

  return (
    <DashboardShell>
      <ProfessorDashboard university={university} />
    </DashboardShell>
  );
}
