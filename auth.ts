import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import authConfig from "./auth.config";
import { SESSION_EXPIRY_REMEMBER_ME, SESSION_EXPIRY_DEFAULT } from "@/lib/constants";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: SESSION_EXPIRY_REMEMBER_ME },
  jwt: {
    maxAge: SESSION_EXPIRY_REMEMBER_ME,
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
    async jwt({ token, user, account }) {
      if (account) {
        token.provider = account.provider;
      }
      if (user && account?.provider !== "google") {
        token.id = user.id;
        token.role = user.role;
        const isRemember = (user as { rememberMe?: boolean }).rememberMe ?? false;
        const duration = isRemember ? SESSION_EXPIRY_REMEMBER_ME : SESSION_EXPIRY_DEFAULT;
        token.absoluteExpiry = Math.floor(Date.now() / 1000) + duration;
      }
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      if (token.absoluteExpiry) {
        token.exp = token.absoluteExpiry as number;
      }
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
        (session.user as { role?: string; provider?: string }).role = token.role as string;
        (session.user as { role?: string; provider?: string }).provider = token.provider as string;
      }
      if (token.exp) {
        (session as { expires?: string }).expires = new Date((token.exp as number) * 1000).toISOString();
      }
      return session;
    },
  },
});
