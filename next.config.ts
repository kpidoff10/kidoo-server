import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Évite le prerender de _global-error qui échoue en monorepo (useContext null)
  // Cette option est déjà dans layout.tsx mais on la garde ici aussi pour être sûr
};

export default nextConfig;
