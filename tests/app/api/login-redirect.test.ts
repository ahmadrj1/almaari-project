/**
 * @jest-environment node
 */

import { GET } from "@/app/(auth)/login/redirect/route";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { Role } from "@prisma/client";

jest.mock("@/lib/auth-session", () => ({
  getServerSessionSnapshot: jest.fn(),
}));

describe("GET /login/redirect", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects ADMIN to callbackUrl when provided and safe", async () => {
    (getServerSessionSnapshot as jest.Mock).mockResolvedValue({
      user: { role: Role.ADMIN },
    });

    const req = new Request(
      "http://localhost:3000/login/redirect?callbackUrl=/admin/orders",
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/orders",
    );
  });

  it("redirects ADMIN to default /admin/products when no callbackUrl provided", async () => {
    (getServerSessionSnapshot as jest.Mock).mockResolvedValue({
      user: { role: Role.ADMIN },
    });

    const req = new Request("http://localhost:3000/login/redirect");
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/products",
    );
  });

  it("redirects USER to / when callbackUrl points to an admin route", async () => {
    (getServerSessionSnapshot as jest.Mock).mockResolvedValue({
      user: { role: Role.USER },
    });

    const req = new Request(
      "http://localhost:3000/login/redirect?callbackUrl=/admin/orders",
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects USER to safe non-admin callbackUrl", async () => {
    (getServerSessionSnapshot as jest.Mock).mockResolvedValue({
      user: { role: Role.USER },
    });

    const req = new Request(
      "http://localhost:3000/login/redirect?callbackUrl=/orders",
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/orders");
  });

  it("rejects malicious open redirect callbackUrl and falls back to default", async () => {
    (getServerSessionSnapshot as jest.Mock).mockResolvedValue({
      user: { role: Role.ADMIN },
    });

    const req = new Request(
      "http://localhost:3000/login/redirect?callbackUrl=//evil.com",
    );
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/admin/products",
    );
  });
});
