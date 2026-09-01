/**
 * @jest-environment node
 */

import { AuthService } from "@/services/auth.service";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { AppError } from "@/lib/api-error";

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("bcryptjs", () => ({
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

// Prevent Stripe from being imported in tests
jest.mock("@/lib/stripe", () => ({
  stripe: { customers: { create: jest.fn().mockResolvedValue({ id: "cus_123" }) } },
  getOrCreateStripeCustomer: jest.fn(),
}));

const mockUser = {
  id: "user-id-123",
  email: "john@example.com",
  fullName: "John Doe",
  passwordHash: "hashed_password",
  resetToken: null,
  resetTokenExp: null,
};

describe("AuthService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const body = {
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    };

    it("creates user and returns success message", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.register(body);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: body.email } });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(result).toBe("User registered successfully");
    });

    it("throws 409 AppError if email already exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(AuthService.register(body)).rejects.toThrow(
        new AppError("Email already exists", 409),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("hashes password with bcrypt before storing", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.register(body);

      expect(bcrypt.genSalt).toHaveBeenCalledWith(12);
      expect(bcrypt.hash).toHaveBeenCalledWith(body.password, "salt");
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: "hashed_password" }),
        }),
      );
    });
  });

  describe("forgotPassword", () => {
    it("returns success message when user not found (security)", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.forgotPassword("unknown@example.com");

      expect(result).toMatch(/if user exists/i);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("stores reset token and sends email when user exists", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const nodemailer = await import("nodemailer");

      const result = await AuthService.forgotPassword("john@example.com");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: "john@example.com" },
          data: expect.objectContaining({
            resetToken: expect.any(String),
            resetTokenExp: expect.any(Date),
          }),
        }),
      );
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(result).toMatch(/if user exists/i);
    });
  });

  describe("verifyResetToken", () => {
    it("returns user when token is valid and not expired", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.verifyResetToken("valid-token");

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          resetToken: "valid-token",
          resetTokenExp: { gt: expect.any(Date) },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it("throws 400 AppError for invalid or expired token", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.verifyResetToken("bad-token")).rejects.toThrow(
        new AppError("Invalid or expired reset token", 400),
      );
    });
  });

  describe("resetPassword", () => {
    it("resets password and clears token fields", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await AuthService.resetPassword("valid-token", "NewPass123!");

      expect(bcrypt.hash).toHaveBeenCalledWith("NewPass123!", 12);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: "hashed_password",
          resetToken: null,
          resetTokenExp: null,
        },
      });
      expect(result).toBe("Password reset successfully.");
    });

    it("throws 400 AppError for invalid/expired token", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(AuthService.resetPassword("bad-token", "Pass123!")).rejects.toThrow(
        new AppError("Invalid or expired reset token.", 400),
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
