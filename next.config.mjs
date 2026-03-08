/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker: standalone output for minimal container image
  output: "standalone",
  // Suppress Mongoose/Winston warnings in Next.js server components
  serverExternalPackages: ["mongoose", "winston"],
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
