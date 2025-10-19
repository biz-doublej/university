import fs from "fs";
import path from "path";
import xlsx from "xlsx";

export async function getUniversityNameFromData(schoolCode?: string | null) {
  // For now we only have a single data file; in future, map schoolCode -> file
  const filePath = path.join(process.cwd(), "data", "20250915_개설강좌조회(학생).xlsx");
  let university = "OO대학교";

  try {
    if (fs.existsSync(filePath)) {
      const wb = xlsx.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const a1 = sheet["A1"]?.v;
      if (a1 && typeof a1 === "string" && a1.trim().length > 0) {
        university = a1.trim();
      }
    }
  } catch (err) {
    // swallow and return default
    console.error("getUniversityNameFromData error:", err);
  }

  // If schoolCode provided, append for clarity (developer view uses code)
  if (schoolCode) return `${university} (${schoolCode})`;
  return university;
}

export default getUniversityNameFromData;
