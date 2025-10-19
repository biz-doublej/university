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

function toSnakeCasePrefs(preferences: any | undefined) {
  if (!preferences) return undefined;
  const result: Record<string, any> = {};
  if (preferences.preferredCourses) {
    result.preferred_courses = preferences.preferredCourses;
  }
  if (preferences.avoidDays) {
    result.avoid_days = preferences.avoidDays;
  }
  if (preferences.avoidPeriods) {
    result.avoid_periods = preferences.avoidPeriods;
  }
  if (preferences.slotGroup) {
    result.slot_group = preferences.slotGroup;
  }
  if (preferences.maxCourses) {
    result.max_courses = preferences.maxCourses;
  }
  return result;
}

export async function POST(request: Request) {
  const auth = getAuthHeader();
  if (!auth) {
    return NextResponse.json(
      { error: "Missing TIMETABLE_SESSION_TOKEN environment variable" },
      { status: 500 },
    );
  }

  let payload: any = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  let studentId = payload.studentId ?? payload.student_id;
  const preferences = toSnakeCasePrefs(payload.preferences);
  const maxCourses = payload.maxCourses ?? payload.max_courses;

  try {
    if (!studentId) {
      const profileRes = await apiFetch("/v1/student/profile", {
        headers: {
          Authorization: auth,
        },
      });
      if (!profileRes.ok) {
        return await forwardResponse(profileRes);
      }
      const profile = await profileRes.json();
      studentId = profile?.id;
      if (!studentId) {
        return NextResponse.json(
          { error: "Unable to resolve student_id from profile" },
          { status: 500 },
        );
      }
    }

    const backendBody: Record<string, any> = {
      student_id: Number(studentId),
    };
    if (preferences) backendBody.preferences = preferences;
    if (maxCourses) backendBody.max_courses = maxCourses;

    const res = await apiFetch("/v1/timetable/recommend", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendBody),
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
