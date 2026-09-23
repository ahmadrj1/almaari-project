import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api/*",
          "/cart",
          "/checkout",
          "/profile",
          "/orders",
          "/notifications",
          "/addresses",
          "/payment-methods",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/reset-link-expired",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
