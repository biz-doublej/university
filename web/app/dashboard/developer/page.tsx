import React from "react";
import DashboardShell from "../../../components/DashboardShell";
import DeveloperDashboard from "../../../components/dashboards/DeveloperDashboard";
import { getUniversityNameFromData } from "../../../lib/getUniversityName";

type Props = { searchParams?: { school?: string } };

export default async function Page({ searchParams }: Props) {
  const schoolCode = searchParams?.school || null;
  const university = await getUniversityNameFromData(schoolCode);

  return (
    <DashboardShell>
      <DeveloperDashboard university={university} schoolCode={schoolCode} />
    </DashboardShell>
  );
}
