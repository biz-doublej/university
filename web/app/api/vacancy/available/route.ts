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
  params.set("day", url.searchParams.get("day") ?? "Mon");
  params.set("start", url.searchParams.get("start") ?? "09:00");
  params.set("end", url.searchParams.get("end") ?? "10:00");
  if (url.searchParams.has("building")) {
    const value = url.searchParams.get("building");
    if (value) params.set("building", value);
  }

  try {
    const res = await apiFetch(`/v1/vacancy/available?${params.toString()}`, {
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
