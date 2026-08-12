import { NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import authConfig from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth(async (_req) => {
  if (process.env.NODE_ENV !== 'production') {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return NextResponse.next();
});

export const config = {
  // Exclude all API routes - they handle auth server-side via auth()
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|images).*)'],
};
