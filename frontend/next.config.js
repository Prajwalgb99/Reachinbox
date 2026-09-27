/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/admin/queues",
        destination: `${backendUrl}/admin/queues`,
      },
      {
        source: "/admin/queues/:path*",
        destination: `${backendUrl}/admin/queues/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
