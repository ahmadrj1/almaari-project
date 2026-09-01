import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { AppError } from "@/lib/api-error";
import { RESET_TOKEN_EXPIRY_MS, APP_NAME } from "@/lib/constants";

import { RegisterInput } from "@/lib/validations/auth";

export class AuthService {
  static async register(body: RegisterInput) {
    const { email, password, fullName, phone } = body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError("Email already exists", 409);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
      },
    });

    return "User registered successfully";
  }

  static async forgotPassword(email: string) {
    const successMessage =
      "If user exists, an email will be sent with instructions.";

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      await new Promise((r) => setTimeout(r, 1000));
      return successMessage;
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
        <p style="color: #333; font-size: 16px;">You requested a password reset for your ${APP_NAME} account. Click the button below to reset your password. This link is valid for 15 minutes from the time this email was sent.</p>
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

    return successMessage;
  }

  static async verifyResetToken(token: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }
    return user;
  }

  static async resetPassword(token: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token.", 400);
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

    return "Password reset successfully.";
  }
}
