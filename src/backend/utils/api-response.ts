/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: API Response Helpers
 * ─────────────────────────────────────────────────────────
 * Strict { status, data, error } JSON response structure.
 */

import { NextResponse } from "next/server";

export interface ApiResponse<T = unknown> {
  status: "success" | "error";
  data: T | null;
  error: string | null;
}

export function apiSuccess<T>(data: T, statusCode = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { status: "success", data, error: null },
    { status: statusCode }
  );
}

export function apiError(
  message: string,
  statusCode = 500
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    { status: "error", data: null, error: message },
    { status: statusCode }
  );
}
