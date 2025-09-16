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

// We previously mapped headers to canonical keys and selected a subset.
// For the user's request, return ALL columns with original header labels as keys.

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

    const limit = Math.max(0, Math.min(parseInt(searchParams.get("limit") || "1500", 10), 5000));
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
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Array<Record<string, any>>;
      rows = raw as any[];
    }

    if (rows.length === 0) {
      return NextResponse.json({ file: path.basename(filePath), items: [], columns: [] });
    }

    // Use raw headers from file and include all columns
    const headers = Object.keys(rows[0] || {});
    const items = rows.slice(0, limit);

    // Extract Building/Room No/Room Name columns if present
    const findHeader = (re: RegExp) => headers.find((h) => re.test(normalizeHeader(h)));
    const buildingH = findHeader(/(건물명)/i);
    const roomNoH = findHeader(/(호실번호)/i);
    const roomNameH = findHeader(/(강의실명|교육공간명)/i);

    let roomItems: Array<{ building: string; room_no: string; room_name: string }> = [];
    if (buildingH || roomNoH || roomNameH) {
      const seen = new Set<string>();
      for (const r of rows) {
        const b = String((buildingH ? r[buildingH] : "") ?? "").trim();
        const no = String((roomNoH ? r[roomNoH] : "") ?? "").trim();
        const nm = String((roomNameH ? r[roomNameH] : "") ?? "").trim();
        if (!b && !no && !nm) continue;
        const key = `${b}||${no}||${nm}`;
        if (seen.has(key)) continue;
        seen.add(key);
        roomItems.push({ building: b, room_no: no, room_name: nm });
      }
      roomItems.sort((a, b) => (a.building || "").localeCompare(b.building || "", "ko") || (a.room_no || "").localeCompare(b.room_no || "", "ko"));
    }

    return NextResponse.json({
      file: path.basename(filePath),
      count: items.length,
      columns: headers,
      items,
      rooms: { items: roomItems },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
