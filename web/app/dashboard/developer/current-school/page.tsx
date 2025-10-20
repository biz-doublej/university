import DashboardShell from "../../../../components/DashboardShell";
import DeveloperCurrentSchoolClient from "../../../../components/developer/DeveloperCurrentSchoolClient";
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
      <DeveloperCurrentSchoolClient university={university} schoolCode={schoolCode} />
    </DashboardShell>
  );
}
