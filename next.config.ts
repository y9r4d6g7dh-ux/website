import type { NextConfig } from "next";
import os from "node:os";

// Allow phones/tablets on the same Wi-Fi to load the dev server (hot reload
// included) via this machine's LAN address, e.g. http://192.168.1.20:3000.
const lanAddresses = Object.values(os.networkInterfaces())
  .flat()
  .filter((n): n is os.NetworkInterfaceInfo => !!n && n.family === "IPv4" && !n.internal)
  .map((n) => n.address);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [...lanAddresses, "*.local"],
  // Next's floating dev badge would cover the mobile tab bar; EasyLife shows
  // its own status pill instead.
  devIndicators: false,
  agentRules: false,
};

export default nextConfig;
