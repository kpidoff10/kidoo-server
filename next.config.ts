import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Évite le prerender de _global-error qui échoue en monorepo (useContext null)
  // Cette option est déjà dans layout.tsx mais on la garde ici aussi pour être sûr
  
  // Configuration Webpack pour résoudre les dépendances de kidoo-shared
  webpack: (config, { isServer }) => {
    // Ajouter node_modules de kidoo-server et kidoo-shared pour résoudre les dépendances
    const serverNodeModules = path.resolve(__dirname, 'node_modules');
    
    // Chercher kidoo-shared dans le monorepo (développement local) ou dans shared/ (Vercel)
    const sharedSourceDir = path.resolve(__dirname, '../kidoo-shared');
    const sharedTargetDir = path.resolve(__dirname, 'shared');
    const sharedDir = fs.existsSync(sharedSourceDir) ? sharedSourceDir : sharedTargetDir;
    const sharedNodeModules = path.resolve(sharedDir, 'node_modules');
    
    const rootNodeModules = path.resolve(__dirname, '../../node_modules');
    
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      serverNodeModules,
      ...(fs.existsSync(sharedNodeModules) ? [sharedNodeModules] : []),
      ...(fs.existsSync(rootNodeModules) ? [rootNodeModules] : []),
      'node_modules',
      ...(config.resolve.modules || []).filter(
        (mod: string) => mod !== serverNodeModules && mod !== sharedNodeModules && mod !== rootNodeModules && mod !== 'node_modules'
      ),
    ];
    
    return config;
  },
};

export default nextConfig;
