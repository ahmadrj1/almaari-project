import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const SESSION_COOKIE_FALLBACK = "authjs.session-token";
const SESSION_COOKIE_SECURE = "__Secure-authjs.session-token";

async function toCookieRequest() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  return new Request("https://example.com", {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

type SessionToken = JWT & {
  id?: string;
  role?: string;
  provider?: string;
  rememberMe?: boolean;
};

function toSession(token: SessionToken | null): Session | null {
  if (!token) return null;

  return {
    user: {
      id: token.id as string,
      name: token.name,
      email: token.email,
      image: token.picture,
      role: token.role as string,
      provider: token.provider as string | undefined,
      rememberMe: token.rememberMe as boolean | undefined,
    },
    expires:
      typeof token.exp === "number"
        ? new Date(token.exp * 1000).toISOString()
        : new Date().toISOString(),
  };
}

async function readToken(secureCookie: boolean) {
  const req = await toCookieRequest();

  return getToken({
    req,
    secret: AUTH_SECRET,
    secureCookie,
    cookieName: secureCookie ? SESSION_COOKIE_SECURE : SESSION_COOKIE_FALLBACK,
  }) as Promise<SessionToken | null>;
}

export async function getServerSessionSnapshot(): Promise<Session | null> {
  const secureToken = await readToken(true);
  if (secureToken) {
    return toSession(secureToken);
  }

  const token = await readToken(false);
  return toSession(token);
}
