import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";
import { forwardResponse, getSessionAuthHeader } from "@lib/server-api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let auth: string;
  try {
    auth = getSessionAuthHeader();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }

  let payload: any = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }
  if (!payload.course_id && !payload.courseId) {
    return NextResponse.json(
      { error: "course_id is required" },
      { status: 400 },
    );
  }

  const backendPayload = {
    course_id: Number(payload.course_id ?? payload.courseId),
    rating_overall: payload.rating_overall ?? payload.ratingOverall ?? null,
    rating_difficulty: payload.rating_difficulty ?? payload.ratingDifficulty ?? null,
    rating_instructor: payload.rating_instructor ?? payload.ratingInstructor ?? null,
    tags: payload.tags ?? [],
    comment: payload.comment ?? "",
    semester: payload.semester ?? null,
    answers: payload.answers ?? [],
  };

  try {
    const res = await apiFetch("/v1/student/reviews", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(backendPayload),
    });
    return await forwardResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }
}
