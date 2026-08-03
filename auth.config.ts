import type { NextAuthConfig } from "next-auth";

export default {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      if (isAuthPage && isLoggedIn) return Response.redirect(new URL("/", nextUrl));
      if (!isAuthPage && !isLoggedIn) return false;
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
