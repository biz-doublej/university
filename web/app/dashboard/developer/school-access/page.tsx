import DashboardShell from "../../../../components/DashboardShell";
import DeveloperSchoolAccessClient from "../../../../components/developer/DeveloperSchoolAccessClient";
import { getUniversityNameFromData } from "../../../../lib/getUniversityName";

type Props = {
  searchParams?: {
    school?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  const schoolCode = searchParams?.school ?? null;
  const university = await getUniversityNameFromData(schoolCode);

  return (
    <DashboardShell>
      <DeveloperSchoolAccessClient university={university} schoolCode={schoolCode} />
    </DashboardShell>
  );
}
