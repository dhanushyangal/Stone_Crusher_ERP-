import { NextResponse } from "next/server";
import { PermissionError } from "@/lib/permissions";
import { ZodError } from "zod";

export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function jsonError(error: unknown) {
  if (error instanceof PermissionError) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: error.message } },
      { status: 403 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Unexpected server error" } },
    { status: 500 },
  );
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}
