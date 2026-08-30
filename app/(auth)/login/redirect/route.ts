import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { JUST_AUTHENTICATED_KEY } from "@/lib/constants";

export async function GET(request: Request) {
  const session = await getServerSessionSnapshot();
  const targetPath =
    session?.user?.role === Role.ADMIN ? "/admin/products" : "/";
  const url = new URL(request.url);

  if (url.searchParams.get("popup") === "true") {
    const html = `<!DOCTYPE html>
<html>
<head><title>Authenticated</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: "AUTH_SUCCESS", targetUrl: "${targetPath}" }, window.location.origin);
    window.close();
  } else {
    window.location.href = "${targetPath}";
  }
</script>
</body>
</html>`;
    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
    response.cookies.set(JUST_AUTHENTICATED_KEY, "true", {
      path: "/",
      maxAge: 300,
      sameSite: "lax",
    });
    return response;
  }

  const redirectUrl = new URL(targetPath, request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(JUST_AUTHENTICATED_KEY, "true", {
    path: "/",
    maxAge: 300,
    sameSite: "lax",
  });
  return response;
}
