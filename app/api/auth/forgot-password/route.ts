import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { RESET_TOKEN_EXPIRY_MS, APP_NAME } from "@/lib/constants";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid data", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Email not linked to any user" },
        { status: 404 }
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExp = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExp,
      },
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/api/auth/verify-reset?token=${resetToken}`;

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaec; border-radius: 8px;">
        <h2 style="color: #2979FF; text-align: center;">Reset Your Password</h2>
        <p style="color: #333; font-size: 16px;">Hello ${user.fullName},</p>
        <p style="color: #333; font-size: 16px;">You requested a password reset for your ${APP_NAME} account. Click the button below to reset your password. This link is valid for a limited time.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2979FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: `Password Reset - ${APP_NAME}`,
      html: htmlTemplate,
    });

    return NextResponse.json({ success: true, message: "A reset link has been sent to your email." });
  } catch (error) {
    logger.error({ err: error }, "Forgot password error");
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
