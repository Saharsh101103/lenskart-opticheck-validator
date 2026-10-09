import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS, validatePrescription } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      valid: false,
      errors: [{ field: "body", code: "INVALID_JSON", message: "Request body must be valid JSON." }],
      values: null
    }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({
      valid: false,
      errors: [{ field: "body", code: "INVALID_BODY", message: "Request body must be a JSON object." }],
      values: null
    }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const result = validatePrescription(data.prescription, data.settings ?? DEFAULT_SETTINGS);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
