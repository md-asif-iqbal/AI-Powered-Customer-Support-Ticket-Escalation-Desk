import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    const rawUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!rawUrl || (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://"))) {
      // In local dev without explicit URL, proxy to local backend default
      if (process.env.NODE_ENV !== "production") {
        return [
          {
            source: "/api/:path*",
            destination: "http://localhost:5001/api/:path*",
          },
        ];
      }
      return [];
    }
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    const destination = cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
    return [
      {
        source: "/api/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;
