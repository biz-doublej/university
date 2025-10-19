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

  const backendPayload = {
    policy_version: payload.policy_version ?? payload.policyVersion ?? 1,
    week: payload.week ?? "2025-01",
    solver: payload.solver ?? "greedy",
    slot_group: payload.slot_group ?? payload.slotGroup ?? 1,
    forbid_checks: payload.forbid_checks ?? payload.forbidChecks ?? true,
  };

  try {
    const res = await apiFetch("/v1/optimize", {
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
