import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleApiError(error: unknown, context: string): NextResponse {
  // Known application errors
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, context }, error.message);
    } else {
      logger.warn({ context, statusCode: error.statusCode }, error.message);
    }
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    const details = error.flatten().fieldErrors as Record<string, string[]>;
    logger.warn({ context, details }, "Validation error");
    return NextResponse.json(
      { success: false, error: "Validation failed", details },
      { status: 400 }
    );
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({ err: error, context, code: error.code }, "Database error");
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "Record already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Database operation failed" },
      { status: 500 }
    );
  }

  // Generic errors
  logger.error({ err: error, context }, "Unhandled error");
  return NextResponse.json(
    { success: false, error: "Internal server error" },
    { status: 500 }
  );
}
