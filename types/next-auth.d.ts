import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      provider?: string;
      rememberMe?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    rememberMe?: boolean;
    provider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    provider?: string;
    rememberMe?: boolean;
    exp?: number;
  }
}
