import { NextResponse } from "next/server";

export function getSessionAuthHeader(): string {
  const token =
    process.env.TIMETABLE_SESSION_TOKEN ||
    process.env.NEXT_PUBLIC_TIMETABLE_SESSION_TOKEN ||
    "";
  if (!token) {
    throw new Error("Missing TIMETABLE_SESSION_TOKEN environment variable");
  }
  return token.startsWith("Bearer ") ? token : `Bearer ${token}`;
}

export function getAdminToken(): string {
  const token = process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || "";
  if (!token) {
    throw new Error("Missing ADMIN_TOKEN environment variable");
  }
  return token;
}

export async function forwardResponse(res: Response) {
  const raw = await res.text();
  let data: any = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
  }
  return NextResponse.json(data, { status: res.status });
}
