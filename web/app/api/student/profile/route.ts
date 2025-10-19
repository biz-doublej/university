import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";

export const runtime = "nodejs";

function getAuthHeader(): string | null {
  const token =
    process.env.TIMETABLE_SESSION_TOKEN ||
    process.env.NEXT_PUBLIC_TIMETABLE_SESSION_TOKEN ||
    null;
  if (!token) return null;
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

async function forwardResponse(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    const text = await res.text();
    data = text ? { raw: text } : {};
  }
  return NextResponse.json(data, { status: res.status });
}

export async function GET() {
  const auth = getAuthHeader();
  if (!auth) {
    return NextResponse.json(
      { error: "Missing TIMETABLE_SESSION_TOKEN environment variable" },
      { status: 500 },
    );
  }
  try {
    const res = await apiFetch("/v1/student/profile", {
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
