/**
 * @jest-environment node
 */

import { AuthController } from "@/controllers/auth.controller";
import { prisma } from "@/lib/db";
import nodemailer from "nodemailer";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

// Mock DB client
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock Nodemailer
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue("salt"),
  hash: jest.fn().mockResolvedValue("hashed_password"),
}));

let credentialsAuthorize: (
  credentials: Record<string, string | undefined>,
) => Promise<unknown>;

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    handlers: {},
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
  })),
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((config: any) => {
    credentialsAuthorize = config.authorize;
    return config;
  }),
}));

jest.mock("next-auth/providers/google", () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock("next-auth/jwt", () => ({
  decode: jest.fn(),
  encode: jest.fn(),
}));

describe("Auth API / Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a user successfully", async () => {
      const mockRequestBody = {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "user-id-123",
      });

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.register(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe("User registered successfully");
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it("should fail registration if validation fails", async () => {
      const mockRequestBody = {
        fullName: "J", // too short
        email: "invalid-email",
        phone: "123",
        password: "123",
        confirmPassword: "456",
      };

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.register(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Validation failed");
    });

    it("should fail registration if email already exists", async () => {
      const mockRequestBody = {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-id",
      });

      const req = new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.register(req);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Email already exists");
    });
  });

  describe("POST /api/auth/forgot-password", () => {
    it("should send a reset email if the user exists", async () => {
      const mockRequestBody = { email: "john@example.com" };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        fullName: "John Doe",
        email: "john@example.com",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const req = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.forgotPassword(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalled();
    });

    it("should return success even if user does not exist (security precaution)", async () => {
      const mockRequestBody = { email: "john@example.com" };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const req = new Request("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.forgotPassword(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/auth/reset-password", () => {
    it("should reset password successfully if session is active", async () => {
      const mockRequestBody = {
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      };

      const mockCookieStore = {
        get: jest.fn().mockReturnValue({ value: "valid-reset-token" }),
        delete: jest.fn(),
      };
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        email: "john@example.com",
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const req = new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.resetPassword(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalled();
      expect(mockCookieStore.delete).toHaveBeenCalledWith("reset_session");
    });

    it("should fail if reset session cookie is missing", async () => {
      const mockRequestBody = {
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      };

      const mockCookieStore = {
        get: jest.fn().mockReturnValue(undefined),
      };
      (cookies as jest.Mock).mockResolvedValue(mockCookieStore);

      const req = new Request("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockRequestBody),
      });

      const response = await AuthController.resetPassword(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No active password reset session.");
    });
  });

  describe("GET /api/auth/verify-reset", () => {
    it("redirects to /reset-password on valid token", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        email: "john@example.com",
      });

      const { cookies } = await import("next/headers");
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      });

      const req = new Request(
        "http://localhost/api/auth/verify-reset?token=valid-token",
        { method: "GET" },
      );

      const response = await AuthController.verifyResetToken(req);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toMatch(/\/reset-password/);
    });

    it("redirects to /reset-link-expired when token is missing", async () => {
      const req = new Request("http://localhost/api/auth/verify-reset", {
        method: "GET",
      });

      const response = await AuthController.verifyResetToken(req);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toMatch(/\/reset-link-expired/);
    });

    it("redirects to /reset-link-expired when token is invalid/expired", async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      const req = new Request(
        "http://localhost/api/auth/verify-reset?token=bad-token",
        { method: "GET" },
      );

      const response = await AuthController.verifyResetToken(req);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toMatch(/\/reset-link-expired/);
    });
  });

  describe("Credentials authorize / login", () => {
    beforeAll(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@/auth"); // triggers Credentials mock, capturing the authorize fn
    });

    it("returns null when user does not exist", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await credentialsAuthorize({
        email: "unknown@example.com",
        password: "Password123!",
      });

      expect(result).toBeNull();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "unknown@example.com" },
      });
    });

    it("returns null when password is incorrect", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        email: "john@example.com",
        fullName: "John Doe",
        role: "USER",
        passwordHash: "hashed_password",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await credentialsAuthorize({
        email: "john@example.com",
        password: "WrongPassword!",
      });

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "WrongPassword!",
        "hashed_password",
      );
    });

    it("returns user object for valid credentials", async () => {
      const mockUser = {
        id: "user-id-123",
        email: "john@example.com",
        fullName: "John Doe",
        role: "USER",
        passwordHash: "hashed_password",
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await credentialsAuthorize({
        email: "john@example.com",
        password: "Password123!",
        rememberMe: "true",
      });

      expect(result).toMatchObject({
        id: "user-id-123",
        email: "john@example.com",
        role: "USER",
        rememberMe: true,
      });
    });

    it("sets rememberMe to false when not provided", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-id-123",
        email: "john@example.com",
        fullName: "John Doe",
        role: "USER",
        passwordHash: "hashed_password",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = (await credentialsAuthorize({
        email: "john@example.com",
        password: "Password123!",
      })) as { rememberMe: boolean };

      expect(result.rememberMe).toBe(false);
    });
  });
});
