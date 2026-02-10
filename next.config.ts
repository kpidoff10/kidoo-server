import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

// Dossier shared : priorité node_modules (après npm install) > monorepo > Vercel shared/
const sharedPackageInNodeModules = path.resolve(__dirname, 'node_modules/@kidoo/shared');
const sharedSourceDir = path.resolve(__dirname, '../kidoo-shared');
const sharedTargetDir = path.resolve(__dirname, 'shared');

function resolveSharedDir(): string {
  if (fs.existsSync(sharedPackageInNodeModules)) {
    return sharedPackageInNodeModules;
  }
  if (fs.existsSync(sharedSourceDir)) {
    return sharedSourceDir;
  }
  return sharedTargetDir;
}
const sharedDir = resolveSharedDir();
const sharedResolveDir = sharedDir;

const nextConfig: NextConfig = {
  /* config options here */

  // Next.js 16 utilise Turbopack par défaut ; config vide pour éviter l’erreur
  // si on a une config webpack (ex. résolution kidoo-shared). Pour forcer webpack : npm run dev -- --webpack
  transpilePackages: ['@kidoo/shared'],

  turbopack: {
    resolveAlias: {
      // Turbopack ne résout pas un dossier vers package.json "main" → pointer vers index.ts
      '@kidoo/shared': path.join(sharedResolveDir, 'index.ts'),
      '@kidoo/shared/*': path.join(sharedResolveDir, '*'),
      // Alias explicite pour Prisma (évite "windows imports" sur Windows)
      '@kidoo/shared/prisma': path.join(sharedResolveDir, 'prisma', 'index.js').replace(/\\/g, '/'),
      '@/shared': path.join(sharedResolveDir, 'index.ts'),
      '@/shared/*': path.join(sharedResolveDir, '*'),
      // @imgly/background-removal importe onnxruntime-web/webgpu (résolution des exports)
      'onnxruntime-web/webgpu': path.join(__dirname, 'node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs').replace(/\\/g, '/'),
    },
  },

  // Configuration Webpack (utilisée en build / si --webpack en dev) pour résoudre kidoo-shared
  webpack: (config, { isServer }) => {
    // Ajouter node_modules de kidoo-server et kidoo-shared pour résoudre les dépendances
    const serverNodeModules = path.resolve(__dirname, 'node_modules');
    
    // Chercher kidoo-shared dans le monorepo (développement local) ou dans shared/ (Vercel)
    const sharedNodeModules = path.resolve(sharedDir, 'node_modules');
    const rootNodeModules = path.resolve(__dirname, '../../node_modules');

    config.resolve = config.resolve || {};
    const sharedPrismaPath = path.join(sharedDir, 'prisma', 'index.js');
    const onnxWebgpuPath = path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@kidoo/shared': sharedDir,
      '@kidoo/shared/prisma': sharedPrismaPath,
      '@kidoo/shared/*': path.join(sharedDir, '*'),
      '@/shared': sharedDir,
      '@/shared/*': path.join(sharedDir, '*'),
      'onnxruntime-web/webgpu': onnxWebgpuPath,
    };
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
