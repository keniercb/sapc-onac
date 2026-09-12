import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Sin rewrites: el frontend llama directamente al backend via NEXT_PUBLIC_API_URL
  // En el sandbox: localhost:4000
  // En producción: dominio del backend (p. ej. https://api.onac.cu)
};

export default nextConfig;
