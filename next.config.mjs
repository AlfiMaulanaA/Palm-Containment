/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Enable static export for frontend-only deployment
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Optimize font loading for static deployment
  optimizeFonts: false, // Disable font optimization to prevent preload warnings
  // Disable server-side features for static export
};

export default nextConfig;
