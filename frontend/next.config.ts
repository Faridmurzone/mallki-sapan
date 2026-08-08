import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida standalone para una imagen Docker liviana (server.js autocontenido).
  output: "standalone",
};

export default nextConfig;
