import type { NextAuthConfig } from "next-auth";

export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.role) {
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as { role?: string })?.role;
      const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(nextUrl.pathname);

      const protectedRoutes = ["/cart", "/checkout", "/profile", "/orders", "/notifications"];
      const isProtectedRoute = protectedRoutes.some((p) => nextUrl.pathname.startsWith(p));
      const isAdminRoute = nextUrl.pathname.startsWith("/admin");

      if (isAuthPage && isLoggedIn) {
        if (userRole === "ADMIN") {
          return Response.redirect(new URL("/admin/products", nextUrl));
        }
        return Response.redirect(new URL("/", nextUrl));
      }

      if (isAdminRoute) {
        if (!isLoggedIn) {
          return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, nextUrl));
        }
        if (userRole !== "ADMIN") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
