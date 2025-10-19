import fs from "fs";
import path from "path";
import xlsx from "xlsx";

type CsvRow = Record<string, unknown>;

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_FILENAME =
  "한국대학교육협의회_대학별학과정보_20250108.csv";
const LEGACY_XLSX = "20250915_개설강좌조회(학생).xlsx";

function sanitizeRow(row: CsvRow): CsvRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, ""), value])
  );
}

function tryReadWorkbook(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return xlsx.readFile(filePath);
  } catch (error) {
    console.error("Failed to read data file:", filePath, error);
    return null;
  }
}

function extractUniversityName(rows: CsvRow[], schoolCode?: string | null): string | null {
  if (!rows.length) return null;

  const sanitized = rows.map(sanitizeRow);
  const findMatch = (predicate: (row: CsvRow) => boolean) =>
    sanitized.find(predicate);

  if (schoolCode) {
    const target = schoolCode.trim();
    const lowerTarget = target.toLowerCase();

    const match =
      findMatch((row) => {
        const name = String(row["학교명"] ?? "").trim();
        return name === target;
      }) ??
      findMatch((row) => {
        const name = String(row["학교명"] ?? "").trim();
        return name.toLowerCase() === lowerTarget;
      }) ??
      findMatch((row) => {
        const name = String(row["학교명"] ?? "").replace(/\s+/g, "");
        return name === target.replace(/\s+/g, "");
      });

    if (match) {
      const name = String(match["학교명"] ?? "").trim();
      if (name) return name;
    }
  }

  const firstName = String(sanitized[0]["학교명"] ?? "").trim();
  return firstName || null;
}

export async function getUniversityNameFromData(schoolCode?: string | null) {
  const csvPath = path.join(DATA_DIR, CSV_FILENAME);
  const xlsxPath = path.join(DATA_DIR, LEGACY_XLSX);

  const workbook =
    tryReadWorkbook(csvPath) ??
    tryReadWorkbook(xlsxPath);

  if (!workbook) {
    const fallback = schoolCode?.trim();
    return fallback && fallback.length > 0 ? fallback : "학교 정보 없음";
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<CsvRow>(sheet, { defval: "" });

  const name = extractUniversityName(rows, schoolCode);
  if (!name) {
    const fallback = schoolCode?.trim();
    return fallback && fallback.length > 0 ? fallback : "학교 정보 없음";
  }

  if (schoolCode) {
    const trimmed = schoolCode.trim();
    if (trimmed.length > 0 && !name.includes(trimmed)) {
      return `${name} (${trimmed})`;
    }
  }

  return name;
}

export default getUniversityNameFromData;
