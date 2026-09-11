import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  allowedDevOrigins: ["192.168.0.223:3000", "192.168.0.223"],

  async headers() {
    const isDev = process.env.NODE_ENV === "development";

    const csp = [
      "default-src 'self'",
      // React needs unsafe-eval in dev for call-stack reconstruction
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://va.vercel-scripts.com https://vitals.vercel-insights.com`,
      // Styles: self + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Fonts
      "font-src 'self' https://fonts.gstatic.com",
      // Images: self + Cloudinary + Unsplash + data URIs (blob previews)
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://lh3.googleusercontent.com",
      // Frames: Stripe checkout only
      "frame-src https://js.stripe.com https://*.stripe.com",
      // XHR/fetch: self + Stripe API + Vercel telemetry + Cloudinary upload
      "connect-src 'self' https://api.stripe.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.cloudinary.com",
      // No objects/embeds
      "object-src 'none'",
      // Enforce HTTPS in production only
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
