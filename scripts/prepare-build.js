/**
 * Script de préparation du build pour Vercel
 * Clone kidoo-shared depuis GitHub si nécessaire (pour Vercel où le monorepo n'est pas disponible)
 * 
 * OPTION 1: Utiliser Git submodules (recommandé)
 *   - Dans kidoo-server: git submodule add https://github.com/VOTRE_USERNAME/kidoo-shared.git shared
 *   - Sur Vercel, ajouter dans Settings > Git > Submodules: activer "Install Git Submodules"
 * 
 * OPTION 2: Cloner depuis GitHub (fallback si submodules ne fonctionne pas)
 *   - Définir la variable d'environnement KIDOO_SHARED_REPO sur Vercel (ex: username/kidoo-shared)
 *   - Le script clonera automatiquement kidoo-shared dans shared/
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const currentDir = __dirname.replace(/[\\/]scripts$/, '');
const sharedSourceDir = path.resolve(currentDir, '../kidoo-shared');
const sharedTargetDir = path.resolve(currentDir, 'shared');

console.log('[PREPARE-BUILD] ==========================================');
console.log('[PREPARE-BUILD] Préparation du build pour Vercel...');
console.log(`[PREPARE-BUILD] Dossier actuel: ${currentDir}`);
console.log(`[PREPARE-BUILD] Source kidoo-shared: ${sharedSourceDir}`);
console.log(`[PREPARE-BUILD] Cible shared: ${sharedTargetDir}`);

// Vérifier si kidoo-shared existe (monorepo local)
if (fs.existsSync(sharedSourceDir)) {
  console.log('[PREPARE-BUILD] kidoo-shared trouvé dans le monorepo - aucune action nécessaire');
  console.log('[PREPARE-BUILD] Le build utilisera le lien npm workspace');
} else if (fs.existsSync(sharedTargetDir)) {
  // Si shared/ existe (submodule ou copié précédemment)
  console.log('[PREPARE-BUILD] Dossier shared/ existe - vérification...');
  
  // Vérifier si c'est un submodule Git
  const gitModulePath = path.join(sharedTargetDir, '.git');
  if (fs.existsSync(gitModulePath) || fs.existsSync(path.join(currentDir, '.git', 'modules', 'shared'))) {
    console.log('[PREPARE-BUILD] shared/ est un Git submodule - aucune action nécessaire');
  } else {
    console.log('[PREPARE-BUILD] shared/ existe mais n\'est pas un submodule - utilisation directe');
  }
  
  // Mettre à jour package.json pour pointer vers shared/ au lieu de ../kidoo-shared
  const packageJsonPath = path.join(currentDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.dependencies['@kidoo/shared'] && packageJson.dependencies['@kidoo/shared'].startsWith('file:../')) {
    packageJson.dependencies['@kidoo/shared'] = 'file:./shared';
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('[PREPARE-BUILD] package.json mis à jour pour pointer vers shared/');
  }
} else {
  // Si ni kidoo-shared ni shared/ n'existent, essayer de cloner depuis GitHub
  console.log('[PREPARE-BUILD] kidoo-shared non trouvé - tentative de clonage depuis GitHub...');
  
  // Récupérer l'URL du dépôt GitHub depuis les variables d'environnement
  const githubRepo = process.env.KIDOO_SHARED_REPO;
  
  if (!githubRepo) {
    console.error('[PREPARE-BUILD] ERREUR: Variable KIDOO_SHARED_REPO non définie');
    console.error('[PREPARE-BUILD] Solutions possibles:');
    console.error('[PREPARE-BUILD] 1. Utiliser Git submodules (recommandé)');
    console.error('[PREPARE-BUILD]    git submodule add https://github.com/VOTRE_USERNAME/kidoo-shared.git shared');
    console.error('[PREPARE-BUILD] 2. Définir KIDOO_SHARED_REPO sur Vercel (ex: username/kidoo-shared)');
    process.exit(1);
  }
  
  const githubUrl = `https://github.com/${githubRepo}.git`;
  console.log(`[PREPARE-BUILD] Clonage de ${githubUrl}...`);
  
  try {
    // Cloner dans shared/
    execSync(`git clone --depth 1 ${githubUrl} ${sharedTargetDir}`, { stdio: 'inherit' });
    
    console.log('[PREPARE-BUILD] kidoo-shared cloné avec succès dans shared/');
    
    // Mettre à jour package.json pour pointer vers shared/
    const packageJsonPath = path.join(currentDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.dependencies['@kidoo/shared']) {
      packageJson.dependencies['@kidoo/shared'] = 'file:./shared';
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('[PREPARE-BUILD] package.json mis à jour pour pointer vers shared/');
    }
  } catch (error) {
    console.error('[PREPARE-BUILD] ERREUR lors du clonage:', error.message);
    console.error('[PREPARE-BUILD] Le build échouera probablement');
    process.exit(1);
  }
}

console.log('[PREPARE-BUILD] ==========================================');
