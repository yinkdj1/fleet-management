/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "production" ? "https://api.carsgidi.com" : "http://localhost:5000");
    return [
      {
        source: '/',
        destination: '/reserve',
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
