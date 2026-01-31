/**
 * Script d'installation pour Vercel avec npm workspaces
 * Gère le clonage de kidoo-shared si nécessaire (pour Vercel où le monorepo n'est pas disponible)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Le script s'exécute depuis kidoo-server/scripts/
const rootDir = path.resolve(__dirname, '../..');
const currentDir = __dirname.replace(/[\\/]scripts$/, '');
const sharedSourceDir = path.resolve(currentDir, '../kidoo-shared');
const sharedTargetDir = path.resolve(currentDir, 'shared');

console.log('[INSTALL-WORKSPACES] ==========================================');
console.log('[INSTALL-WORKSPACES] Installation des workspaces npm...');
console.log(`[INSTALL-WORKSPACES] Root monorepo: ${rootDir}`);
console.log(`[INSTALL-WORKSPACES] Dossier actuel: ${currentDir}`);
console.log(`[INSTALL-WORKSPACES] Source kidoo-shared: ${sharedSourceDir}`);
console.log(`[INSTALL-WORKSPACES] Cible shared: ${sharedTargetDir}`);

// ÉTAPE 1: Vérifier et préparer kidoo-shared
let sharedPath = null;
let needPackageJsonUpdate = false;

if (fs.existsSync(sharedSourceDir)) {
  // Cas 1: kidoo-shared existe dans le monorepo (développement local)
  console.log('[INSTALL-WORKSPACES] kidoo-shared trouvé dans le monorepo');
  sharedPath = sharedSourceDir;
} else if (fs.existsSync(sharedTargetDir)) {
  // Cas 2: shared/ existe déjà (submodule Git ou copié précédemment)
  console.log('[INSTALL-WORKSPACES] Dossier shared/ existe déjà');
  sharedPath = sharedTargetDir;
  needPackageJsonUpdate = true;
} else {
  // Cas 3: Sur Vercel, cloner kidoo-shared depuis GitHub
  console.log('[INSTALL-WORKSPACES] kidoo-shared non trouvé - tentative de clonage depuis GitHub...');
  
  const githubRepo = process.env.KIDOO_SHARED_REPO;
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubRepo) {
    console.error('[INSTALL-WORKSPACES] ERREUR: Variable KIDOO_SHARED_REPO non définie');
    console.error('[INSTALL-WORKSPACES] Solutions possibles:');
    console.error('[INSTALL-WORKSPACES] 1. Utiliser Git submodules (recommandé)');
    console.error('[INSTALL-WORKSPACES]    git submodule add https://github.com/VOTRE_USERNAME/kidoo-shared.git shared');
    console.error('[INSTALL-WORKSPACES]    Puis activer "Install Git Submodules" sur Vercel');
    console.error('[INSTALL-WORKSPACES] 2. Définir KIDOO_SHARED_REPO sur Vercel (ex: username/kidoo-shared)');
    console.error('[INSTALL-WORKSPACES]    Voir VERCEL_SETUP.md pour plus de détails');
    process.exit(1);
  }
  
  // Construire l'URL GitHub avec token si disponible (pour dépôts privés)
  let githubUrl;
  if (githubToken) {
    githubUrl = `https://${githubToken}@github.com/${githubRepo}.git`;
    console.log('[INSTALL-WORKSPACES] Utilisation d\'un token GitHub pour cloner (dépôt privé)');
  } else {
    githubUrl = `https://github.com/${githubRepo}.git`;
  }
  
  console.log(`[INSTALL-WORKSPACES] Clonage de ${githubRepo} dans shared/...`);
  
  try {
    execSync(`git clone --depth 1 ${githubUrl} ${sharedTargetDir}`, { stdio: 'inherit' });
    console.log('[INSTALL-WORKSPACES] kidoo-shared cloné avec succès dans shared/');
    sharedPath = sharedTargetDir;
    needPackageJsonUpdate = true;
  } catch (error) {
    console.error('[INSTALL-WORKSPACES] ERREUR lors du clonage:', error.message);
    console.error('[INSTALL-WORKSPACES] Vérifiez que:');
    console.error('[INSTALL-WORKSPACES] 1. Le dépôt existe et est accessible');
    console.error('[INSTALL-WORKSPACES] 2. Si privé, GITHUB_TOKEN est défini sur Vercel');
    console.error('[INSTALL-WORKSPACES] 3. Le format de KIDOO_SHARED_REPO est correct (username/repo)');
    process.exit(1);
  }
}

// ÉTAPE 2: Mettre à jour package.json et tsconfig.json si nécessaire
if (needPackageJsonUpdate) {
  // Mettre à jour package.json
  const packageJsonPath = path.join(currentDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.dependencies['@kidoo/shared'] && packageJson.dependencies['@kidoo/shared'].startsWith('file:../')) {
    packageJson.dependencies['@kidoo/shared'] = 'file:./shared';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('[INSTALL-WORKSPACES] package.json mis à jour pour pointer vers shared/');
  }
  
  // Mettre à jour tsconfig.json pour que @/shared pointe vers shared/
  const tsconfigPath = path.join(currentDir, 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.paths) {
      if (tsconfig.compilerOptions.paths['@/shared']) {
        tsconfig.compilerOptions.paths['@/shared'] = ['./shared'];
        console.log('[INSTALL-WORKSPACES] tsconfig.json mis à jour pour pointer vers shared/');
      }
      if (tsconfig.compilerOptions.paths['@/shared/*']) {
        tsconfig.compilerOptions.paths['@/shared/*'] = ['./shared/*'];
        console.log('[INSTALL-WORKSPACES] tsconfig.json paths mis à jour pour shared/*');
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    }
  }
}

// ÉTAPE 3: Installer les dépendances
console.log('[INSTALL-WORKSPACES] Installation des dépendances...');
process.chdir(currentDir);
console.log(`[INSTALL-WORKSPACES] CWD: ${process.cwd()}`);

try {
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('[INSTALL-WORKSPACES] Installation terminée avec succès');
} catch (error) {
  console.error('[INSTALL-WORKSPACES] ERREUR lors de l\'installation:', error.message);
  process.exit(1);
}

console.log('[INSTALL-WORKSPACES] ==========================================');
