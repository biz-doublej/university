import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";
import { forwardResponse, getSessionAuthHeader } from "@lib/server-api";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let auth: string;
  try {
    auth = getSessionAuthHeader();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const params = new URLSearchParams();
  params.set("week", url.searchParams.get("week") ?? "2025-01");
  const tenant =
    url.searchParams.get("tenant") ||
    process.env.NEXT_PUBLIC_TENANT_ID ||
    process.env.NEXT_PUBLIC_UNIVERSITY_NAME ||
    "demo";
  params.set("tenant", tenant);

  try {
    const res = await apiFetch(`/v1/timetable/rooms?${params.toString()}`, {
      headers: {
        Authorization: auth,
      },
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
