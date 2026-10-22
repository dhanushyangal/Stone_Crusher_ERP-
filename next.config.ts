import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Authenticated ERP — all pages/APIs are request-time dynamic.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
