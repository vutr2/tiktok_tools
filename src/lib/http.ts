import { NextResponse } from "next/server";
import { toErrorResponse } from "./errors";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(err: unknown) {
  const { status, body } = toErrorResponse(err);
  return NextResponse.json(body, { status });
}
