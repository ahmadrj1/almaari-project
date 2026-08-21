import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { decode as jwtDecode, encode as jwtEncode } from "next-auth/jwt";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";
import { SESSION_EXPIRY_REMEMBER_ME, SESSION_EXPIRY_DEFAULT } from "@/lib/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: SESSION_EXPIRY_REMEMBER_ME, updateAge: SESSION_EXPIRY_REMEMBER_ME },
  jwt: {
    maxAge: SESSION_EXPIRY_REMEMBER_ME,
    async encode({ token, secret, salt, maxAge }) {
      if (!token) return "";

      const expiry = typeof token.exp === "number" ? token.exp : undefined;
      const effectiveMaxAge =
        expiry !== undefined
          ? Math.max(expiry - Math.floor(Date.now() / 1000), 0)
          : maxAge ?? SESSION_EXPIRY_DEFAULT;

      return jwtEncode({ token, secret, salt, maxAge: effectiveMaxAge });
    },
    async decode({ token, secret, salt }) {
      return jwtDecode({ token, secret, salt });
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        const rememberMeValue = credentials.rememberMe;
        return { 
          id: user.id, 
          name: user.fullName, 
          email: user.email,
          role: user.role,
          rememberMe: rememberMeValue === "true" || rememberMeValue === "on" || rememberMeValue === "1"
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await prisma.user.upsert({
          where: { email: user.email },
          update: {},
          create: {
            email: user.email,
            fullName: user.name || "Google User",
            phone: "",
            passwordHash: "",
          },
        });
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (account) {
        token.provider = account.provider;
      }

      if (typeof token.rememberMe !== "boolean") {
        token.rememberMe = false;
      }

      if (trigger === "update" && typeof session?.rememberMe === "boolean") {
        token.rememberMe = session.rememberMe;
        token.exp = Math.floor(Date.now() / 1000) +
          (token.rememberMe ? SESSION_EXPIRY_REMEMBER_ME : SESSION_EXPIRY_DEFAULT);
      }

      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe ?? false;

        token.exp = Math.floor(Date.now() / 1000) +
          (account?.provider === "google" || !token.rememberMe
            ? SESSION_EXPIRY_DEFAULT
            : SESSION_EXPIRY_REMEMBER_ME);
      } else if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      if (token.email && (!token.id || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        (session.user as { role?: string; provider?: string }).role = token.role as string;
        (session.user as { role?: string; provider?: string }).provider = token.provider as string;
        (session.user as { rememberMe?: boolean }).rememberMe = token.rememberMe as boolean;
      }
      if (token.exp) {
        (session as { expires?: string }).expires = new Date((token.exp as number) * 1000).toISOString();
      }
      return session;
    },
  },
});
