import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/reset-link-expired", req.url));
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.redirect(new URL("/reset-link-expired", req.url));
    }

    const cookieStore = await cookies();
    cookieStore.set("reset_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 3600, // 1 hour
    });

    return NextResponse.redirect(new URL("/reset-password", req.url));
  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.redirect(new URL("/login?error=Something went wrong", req.url));
  }
}
