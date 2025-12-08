import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";
import { getSessionAuthHeader, forwardResponse } from "@lib/server-api";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = getSessionAuthHeader();
    const res = await apiFetch("/v1/tenant-admin/fixed-summary", {
      headers: {
        Authorization: auth,
      },
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
