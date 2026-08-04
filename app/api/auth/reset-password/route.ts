import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = resetPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("reset_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No active password reset session." },
        { status: 401 }
      );
    }

    const { password } = result.data;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    cookieStore.delete("reset_session");

    return NextResponse.json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
