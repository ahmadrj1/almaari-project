import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppError } from "@/lib/api-error";
import { RESET_TOKEN_EXPIRY_MS } from "@/lib/constants";

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

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        phone,
      },
    });

    try {
      const { stripe } = await import("@/lib/stripe");
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.fullName,
        metadata: { userId: user.id },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    } catch (_e) {
      // Non-fatal, will be lazily created on checkout
    }

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

    const { queueForgotPasswordEmail } = await import("@/lib/job-scheduler");
    await queueForgotPasswordEmail(email, resetToken);

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
