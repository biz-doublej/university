import { NextResponse } from "next/server";

import { apiFetch } from "@lib/api";
import { forwardResponse, getSessionAuthHeader } from "@lib/server-api";

export const runtime = "nodejs";

type Params = {
  params: {
    courseId: string;
  };
};

export async function GET(_: Request, { params }: Params) {
  let auth: string;
  try {
    auth = getSessionAuthHeader();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }

  const id = Number(params.courseId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  try {
    const res = await apiFetch(`/v1/faculty/courses/${id}/reviews`, {
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

export async function POST(request: Request, { params }: Params) {
  let auth: string;
  try {
    auth = getSessionAuthHeader();
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 },
    );
  }

  const id = Number(params.courseId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
  }

  let payload: any = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const backendPayload = {
    course_id: id,
    rating_overall: payload.rating_overall ?? payload.ratingOverall ?? null,
    rating_difficulty: payload.rating_difficulty ?? payload.ratingDifficulty ?? null,
    rating_instructor: payload.rating_instructor ?? payload.ratingInstructor ?? null,
    tags: payload.tags ?? [],
    comment: payload.comment ?? "",
    semester: payload.semester ?? null,
  };

  try {
    const res = await apiFetch(`/v1/faculty/courses/${id}/reviews/ack`, {
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
