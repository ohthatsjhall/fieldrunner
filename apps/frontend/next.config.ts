import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fieldrunner/shared"],
  turbopack: {
    root: __dirname + "/../..",
  },
};

export default nextConfig;
