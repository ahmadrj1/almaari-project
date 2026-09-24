import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ online: false }, { status: 401 });
  }

  const apiKeyPresent = Boolean(
    process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY,
  );
  return NextResponse.json({ online: apiKeyPresent });
}
