import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";
import { forwardResponse, getSessionAuthHeader } from "@lib/server-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await apiFetch("/v1/tenant-admin/curriculum", {
      headers: {
        Authorization: getSessionAuthHeader(),
      },
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: Record<string, any> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  try {
    const res = await apiFetch("/v1/tenant-admin/curriculum", {
      method: "POST",
      headers: {
        Authorization: getSessionAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
