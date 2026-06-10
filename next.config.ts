import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: ['react-leaflet', '@react-leaflet/core'],
  allowedDevOrigins: ['10.2.181.198'],
};

export default nextConfig;
