import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";
import { SESSION_EXPIRY_REMEMBER_ME, SESSION_EXPIRY_DEFAULT } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: SESSION_EXPIRY_REMEMBER_ME },
  logger: {
    error(error) {
      const code = (error as { type?: string }).type ?? error.name;
      if (code === "CredentialsSignin") {
        logger.warn({ code }, "Invalid credentials attempt");
      } else {
        logger.error({ err: error, code }, "Auth error");
      }
    },
    warn(code) { logger.warn({ code }, "Auth warning"); },
    debug(code, metadata) { logger.debug({ code, metadata }, "Auth debug"); },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return { 
          id: user.id, 
          name: user.fullName, 
          email: user.email,
          role: user.role,
          rememberMe: credentials.rememberMe === "true"
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              fullName: user.name || "Google User",
              phone: "",
              passwordHash: "",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        const isRemember = (user as { rememberMe?: boolean }).rememberMe ?? false;
        const expiryDuration = isRemember ? SESSION_EXPIRY_REMEMBER_ME : SESSION_EXPIRY_DEFAULT;
        token.exp = Math.floor(Date.now() / 1000) + expiryDuration;
      }
      // If logging in via Google, user.id might be the Google provider's sub ID, so we look up the DB user id
      if (!token.id && token.email) {
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
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
