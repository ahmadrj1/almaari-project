import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSessionSnapshot } from "@/lib/auth-session";

export async function GET(request: Request) {
  const session = await getServerSessionSnapshot();
  const redirectUrl = new URL(session?.user?.role === Role.ADMIN ? "/admin/products" : "/", request.url);

  return NextResponse.redirect(redirectUrl);
}

