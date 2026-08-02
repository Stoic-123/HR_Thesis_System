import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:8080"}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:8080"}/uploads/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
