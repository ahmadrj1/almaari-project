/**
 * @jest-environment node
 */

import authConfig from "@/auth.config";

describe("auth.config.ts authorized callback", () => {
  const authorized = authConfig.callbacks?.authorized;

  if (!authorized) {
    throw new Error("authorized callback is not defined");
  }

  const createReq = (pathname: string, search = "") => ({
    nextUrl: new URL(`http://localhost:3000${pathname}${search}`),
  }) as any;

  describe("Opening website (homepage /)", () => {
    it("redirects to /admin/products if old session exists with ADMIN role", async () => {
      const res = await authorized({
        auth: { user: { role: "ADMIN" }, expires: "" } as any,
        request: createReq("/"),
      });

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("location")).toBe(
        "http://localhost:3000/admin/products",
      );
    });

    it("allows navigation to / if old session exists with USER role", async () => {
      const res = await authorized({
        auth: { user: { role: "USER" }, expires: "" } as any,
        request: createReq("/"),
      });

      expect(res).toBe(true);
    });

    it("allows navigation to / if no session exists", async () => {
      const res = await authorized({
        auth: null,
        request: createReq("/"),
      });

      expect(res).toBe(true);
    });
  });

  describe("Admin cannot visit user side pages", () => {
    const userPages = [
      "/",
      "/products",
      "/cart",
      "/orders",
      "/addresses",
      "/payment-methods",
      "/payment/success",
      "/payment/failed",
    ];

    userPages.forEach((path) => {
      it(`redirects ADMIN from ${path} to /admin/products`, async () => {
        const res = await authorized({
          auth: { user: { role: "ADMIN" }, expires: "" } as any,
          request: createReq(path),
        });

        expect(res).toBeInstanceOf(Response);
        expect((res as Response).status).toBe(302);
        expect((res as Response).headers.get("location")).toBe(
          "http://localhost:3000/admin/products",
        );
      });
    });

    it("redirects logged-in ADMIN from auth page to /admin/products even if callbackUrl is user page", async () => {
      const res = await authorized({
        auth: { user: { role: "ADMIN" }, expires: "" } as any,
        request: createReq("/login", "?callbackUrl=/orders"),
      });

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("location")).toBe(
        "http://localhost:3000/admin/products",
      );
    });

    it("allows ADMIN to redirect to safe admin callbackUrl from auth page", async () => {
      const res = await authorized({
        auth: { user: { role: "ADMIN" }, expires: "" } as any,
        request: createReq("/login", "?callbackUrl=/admin/orders"),
      });

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("location")).toBe(
        "http://localhost:3000/admin/orders",
      );
    });
  });

  describe("Admin pages access control", () => {
    it("allows ADMIN to access /admin/products", async () => {
      const res = await authorized({
        auth: { user: { role: "ADMIN" }, expires: "" } as any,
        request: createReq("/admin/products"),
      });

      expect(res).toBe(true);
    });

    it("allows ADMIN to access /admin/orders", async () => {
      const res = await authorized({
        auth: { user: { role: "ADMIN" }, expires: "" } as any,
        request: createReq("/admin/orders"),
      });

      expect(res).toBe(true);
    });

    it("redirects USER trying to access /admin/products to /", async () => {
      const res = await authorized({
        auth: { user: { role: "USER" }, expires: "" } as any,
        request: createReq("/admin/products"),
      });

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("location")).toBe(
        "http://localhost:3000/",
      );
    });

    it("redirects unauthenticated user trying to access /admin/products to /login", async () => {
      const res = await authorized({
        auth: null,
        request: createReq("/admin/products"),
      });

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).status).toBe(302);
      expect((res as Response).headers.get("location")).toBe(
        "http://localhost:3000/login?callbackUrl=%2Fadmin%2Fproducts",
      );
    });
  });

  describe("User routes access control", () => {
    it("allows USER to access protected user routes", async () => {
      const res = await authorized({
        auth: { user: { role: "USER" }, expires: "" } as any,
        request: createReq("/cart"),
      });

      expect(res).toBe(true);
    });

    it("denies unauthenticated access to protected user routes", async () => {
      const res = await authorized({
        auth: null,
        request: createReq("/cart"),
      });

      expect(res).toBe(false);
    });
  });
});
