import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
export const runtime = "nodejs";

function findDataFile(preferred?: string): string | null {
  // repo root is one level up from `web/`
  const root = path.resolve(process.cwd(), "..");
  const dataDir = path.join(root, "data");
  if (!fs.existsSync(dataDir)) return null;

  if (preferred) {
    const candidate = path.isAbsolute(preferred)
      ? preferred
      : path.join(dataDir, preferred);
    if (fs.existsSync(candidate)) return candidate;
  }

  const files = fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => /\.(xlsx|xls|csv)$/i.test(n))
    .sort();
  if (files.length === 0) return null;
  return path.join(dataDir, files[0]);
}

function normalizeHeader(h: string): string {
  return h.replace(/["'\s\n\r\t]/g, "");
}

const headerMap: Array<{ re: RegExp; key: string }> = [
  { re: /^(순번|no|index)$/i, key: "idx" },
  { re: /(과정|program)/i, key: "program" },
  { re: /(개설학과|학과|department)/i, key: "department" },
  { re: /(교과목.*코드|과목코드|code)/i, key: "course_code" },
  { re: /(교과목명|과목명|name|title)/i, key: "course_name" },
  { re: /(개설\s*학년|학년|grade)/i, key: "grade" },
  { re: /(수강\s*분반|분반|section)/i, key: "section" },
  { re: /(영역구분)/i, key: "category" },
  { re: /(수강\s*인원|수강인원|enrolled|등록인원)/i, key: "enrolled" },
  { re: /(제한\s*인원|정원|limit|capacity)/i, key: "limit" },
  { re: /(개설강좌\s*구분)/i, key: "course_type" },
  { re: /(주야\s*구분)/i, key: "daynight" },
  { re: /(개설강좌\s*상태구분|상태)/i, key: "status" },
  { re: /(강좌\s*대표교수)/i, key: "lead_prof" },
  { re: /(강좌\s*담당교수|담당교수|교강사|instructor)/i, key: "instructor" },
  { re: /(수업진행구분)/i, key: "progress_type" },
  { re: /(수업\s*주수)/i, key: "weeks" },
  { re: /(교과목\s*학점|학점|credits)/i, key: "credits" },
  { re: /(강의유형\s*구분)/i, key: "class_type" },
  { re: /(교과목\s*구분)/i, key: "subject_type" },
  { re: /(성적부여\s*방법구분)/i, key: "grading" },
  { re: /(타교강좌\s*구분)/i, key: "external" },
  { re: /(건물명)/i, key: "building" },
  { re: /(호실번호)/i, key: "room_no" },
  { re: /(강의실명|교육공간명)/i, key: "room_name" },
  { re: /(수업시간표.*요약)/i, key: "timeslot" },
  { re: /(합반분반구분)/i, key: "combined_section" },
  { re: /(학습.*실습.*운영계획서.*조회)/i, key: "plan_url" },
];

function mapHeaders(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    const norm = normalizeHeader(h);
    const hit = headerMap.find((m) => m.re.test(norm));
    if (hit) result[h] = hit.key;
    else result[h] = norm; // fallback to normalized
  }
  return result;
}

function takeColumns(row: any) {
  // Select a useful subset for the table
  return {
    department: row.department ?? null,
    course_code: row.course_code ?? null,
    course_name: row.course_name ?? null,
    grade: row.grade ?? null,
    section: row.section ?? null,
    enrolled: row.enrolled ?? null,
    limit: row.limit ?? row.capacity ?? null,
    instructor: row.instructor ?? row.lead_prof ?? null,
    building: row.building ?? null,
    room: row.room_name ?? row.room_no ?? null,
    timeslot: row.timeslot ?? null,
  };
}

function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    if (!line) continue;
    const cols: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur);
    // skip empty rows
    if (cols.every((c) => c.trim() === "")) continue;
    rows.push(cols);
  }
  if (rows.length === 0) return [];
  const header = rows[0];
  const out: any[] = [];
  for (let r = 1; r < rows.length; r++) {
    const obj: any = {};
    const row = rows[r];
    for (let c = 0; c < header.length; c++) {
      obj[header[c]] = row[c] ?? "";
    }
    out.push(obj);
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const preferred = searchParams.get("file") || process.env.DATA_XLSX || undefined;
    const filePath = findDataFile(preferred);
    if (!filePath) {
      return NextResponse.json(
        { error: "No data file found. Put an .xlsx/.xls/.csv under repo-root /data." },
        { status: 404 }
      );
    }

    const limit = Math.max(0, Math.min(parseInt(searchParams.get("limit") || "500", 10), 5000));
    const ext = path.extname(filePath).toLowerCase();

    let rows: any[] = [];
    if (ext === ".csv") {
      const csv = fs.readFileSync(filePath, "utf8");
      rows = parseCSV(csv);
    } else {
      // Lazy-load only when needed for Excel
      let XLSX: any;
      try {
        const mod: any = await import(/* webpackIgnore: true */ "xlsx");
        XLSX = mod?.default || mod;
      } catch (e) {
        return NextResponse.json(
          { error: "Missing dependency 'xlsx'. Run: cd web && npm install" },
          { status: 500 }
        );
      }
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
      rows = raw as any[];
    }

    if (rows.length === 0) {
      return NextResponse.json({ file: path.basename(filePath), items: [], columns: [] });
    }

    // Header mapping using keys of first row
    const headers = Object.keys(rows[0]);
    const map = mapHeaders(headers);
    const mapped = rows.map((r) => {
      const o: Record<string, any> = {};
      for (const [orig, v] of Object.entries(r)) {
        const key = map[orig as string] || orig;
        o[key] = v;
      }
      return takeColumns(o);
    });

    const items = mapped.slice(0, limit);
    const columns = Object.keys(items[0] || {});
    return NextResponse.json({ file: path.basename(filePath), count: items.length, columns, items });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
