import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const ADMIN = process.env.ADMIN_TOKEN || "";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const r = await fetch(`${BASE}/v1/admin/projects/${params.id}/keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": ADMIN },
      body: JSON.stringify(body || {}),
    });
    const j = await r.json();
    return NextResponse.json(j, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message || e) }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const r = await fetch(`${BASE}/v1/admin/projects/${params.id}/keys`, {
      method: "GET",
      headers: { "X-Admin-Token": ADMIN },
    });
    const j = await r.json();
    return NextResponse.json(j, { status: r.status });
  } catch (e: any) {
    return NextResponse.json({ detail: String(e?.message || e) }, { status: 500 });
  }
}

