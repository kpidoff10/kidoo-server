/**
 * Script d'installation pour Vercel avec npm workspaces
 * Installe depuis la racine du monorepo pour avoir accès à kidoo-shared/
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Le script s'exécute depuis kidoo-server/scripts/
// On monte de 2 niveaux pour atteindre la racine du monorepo
const rootDir = path.resolve(__dirname, '../..');
const currentDir = __dirname.replace(/[\\/]scripts$/, '');

console.log('[INSTALL-WORKSPACES] ==========================================');
console.log('[INSTALL-WORKSPACES] Installation des workspaces npm...');
console.log(`[INSTALL-WORKSPACES] Root monorepo: ${rootDir}`);
console.log(`[INSTALL-WORKSPACES] Dossier actuel: ${currentDir}`);
console.log(`[INSTALL-WORKSPACES] CWD avant: ${process.cwd()}`);

// Vérifier si on est dans un contexte monorepo (racine avec package.json et kidoo-shared/)
const rootPackageJson = path.join(rootDir, 'package.json');
const sharedDir = path.join(rootDir, 'kidoo-shared');

console.log(`[INSTALL-WORKSPACES] Root package.json existe: ${fs.existsSync(rootPackageJson)}`);
console.log(`[INSTALL-WORKSPACES] Shared dir existe: ${fs.existsSync(sharedDir)}`);

if (fs.existsSync(rootPackageJson) && fs.existsSync(sharedDir)) {
  // D'abord installer React localement dans kidoo-server pour garantir qu'il est disponible
  console.log('[INSTALL-WORKSPACES] Installation préalable de React dans kidoo-server...');
  process.chdir(currentDir);
  console.log(`[INSTALL-WORKSPACES] CWD pour installation React: ${process.cwd()}`);
  execSync('npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps --save-exact', { stdio: 'inherit' });
  console.log('[INSTALL-WORKSPACES] React installé dans kidoo-server');
  
  // Ensuite installer depuis la racine pour les workspaces
  console.log('[INSTALL-WORKSPACES] Installation depuis la racine du monorepo...');
  process.chdir(rootDir);
  console.log(`[INSTALL-WORKSPACES] CWD après chdir: ${process.cwd()}`);
  
  // S'assurer que React est aussi disponible à la racine pour Next.js
  // Next.js cherche parfois React depuis la racine du dépôt
  const rootNodeModules = path.join(rootDir, 'node_modules');
  const rootReactPath = path.join(rootNodeModules, 'react');
  
  if (!fs.existsSync(rootReactPath)) {
    console.log('[INSTALL-WORKSPACES] React n\'est pas à la racine, installation...');
    // Créer un package.json temporaire à la racine avec React si nécessaire
    const rootPackageJsonContent = JSON.parse(fs.readFileSync(rootPackageJson, 'utf8'));
    if (!rootPackageJsonContent.dependencies) {
      rootPackageJsonContent.dependencies = {};
    }
    if (!rootPackageJsonContent.dependencies.react) {
      rootPackageJsonContent.dependencies.react = '19.1.0';
      rootPackageJsonContent.dependencies['react-dom'] = '19.1.0';
      fs.writeFileSync(rootPackageJson, JSON.stringify(rootPackageJsonContent, null, 2));
      console.log('[INSTALL-WORKSPACES] React ajouté aux dépendances racine');
    }
  }
  
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('[INSTALL-WORKSPACES] Installation terminée depuis la racine');
  
  // Vérifier que React est bien installé à la racine
  const reactRootPath = path.join(rootDir, 'node_modules', 'react');
  const reactDomRootPath = path.join(rootDir, 'node_modules', 'react-dom');
  
  console.log(`[INSTALL-WORKSPACES] React à la racine: ${fs.existsSync(reactRootPath)}`);
  console.log(`[INSTALL-WORKSPACES] React-dom à la racine: ${fs.existsSync(reactDomRootPath)}`);
  
  // S'assurer que les dépendances sont bien accessibles dans kidoo-server
  console.log('[INSTALL-WORKSPACES] Vérification dans kidoo-server...');
  process.chdir(currentDir);
  console.log(`[INSTALL-WORKSPACES] CWD après chdir vers kidoo-server: ${process.cwd()}`);
  
  const reactLocalPath = path.join(currentDir, 'node_modules', 'react');
  const reactDomLocalPath = path.join(currentDir, 'node_modules', 'react-dom');
  
  console.log(`[INSTALL-WORKSPACES] React local: ${fs.existsSync(reactLocalPath)}`);
  console.log(`[INSTALL-WORKSPACES] React-dom local: ${fs.existsSync(reactDomLocalPath)}`);
  
  // TOUJOURS installer React directement dans kidoo-server pour garantir qu'il est disponible
  // npm workspaces peut hoister les dépendances à la racine, mais Next.js les cherche dans kidoo-server/node_modules/
  // On doit forcer l'installation locale même si npm workspaces veut hoister
  console.log('[INSTALL-WORKSPACES] Installation forcée de React dans kidoo-server (nécessaire pour Next.js)...');
  
  // Créer node_modules s'il n'existe pas
  const nodeModulesDir = path.join(currentDir, 'node_modules');
  if (!fs.existsSync(nodeModulesDir)) {
    fs.mkdirSync(nodeModulesDir, { recursive: true });
    console.log('[INSTALL-WORKSPACES] Dossier node_modules créé dans kidoo-server');
  }
  
  // Installer React avec --no-workspaces pour forcer l'installation locale
  // Mais d'abord, sauvegarder le package.json pour éviter que npm workspaces ne l'ignore
  const packageJsonPath = path.join(currentDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // S'assurer que React est bien dans les dépendances
  if (!packageJson.dependencies.react) {
    packageJson.dependencies.react = '19.1.0';
  }
  if (!packageJson.dependencies['react-dom']) {
    packageJson.dependencies['react-dom'] = '19.1.0';
  }
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Installer avec --legacy-peer-deps
  execSync('npm install react@19.1.0 react-dom@19.1.0 --legacy-peer-deps --save-exact', { stdio: 'inherit' });
  console.log('[INSTALL-WORKSPACES] React installé directement dans kidoo-server');
  
  // Vérification finale avec logs détaillés
  console.log(`[INSTALL-WORKSPACES] Vérification finale - React local: ${fs.existsSync(reactLocalPath)}`);
  console.log(`[INSTALL-WORKSPACES] Vérification finale - React-dom local: ${fs.existsSync(reactDomLocalPath)}`);
  
  // Si React n'est toujours pas disponible localement après toutes les tentatives,
  // créer des liens symboliques depuis la racine vers kidoo-server
  if (!fs.existsSync(reactLocalPath) && fs.existsSync(reactRootPath)) {
    console.log('[INSTALL-WORKSPACES] Création d\'un lien symbolique depuis la racine...');
    try {
      const relativePath = path.relative(nodeModulesDir, reactRootPath);
      fs.symlinkSync(relativePath, reactLocalPath, 'dir');
      console.log('[INSTALL-WORKSPACES] Lien symbolique créé pour React');
    } catch (err) {
      console.log(`[INSTALL-WORKSPACES] Erreur lors de la création du lien: ${err.message}`);
    }
  }
  
  if (!fs.existsSync(reactDomLocalPath) && fs.existsSync(reactDomRootPath)) {
    console.log('[INSTALL-WORKSPACES] Création d\'un lien symbolique pour react-dom depuis la racine...');
    try {
      const relativePath = path.relative(nodeModulesDir, reactDomRootPath);
      fs.symlinkSync(relativePath, reactDomLocalPath, 'dir');
      console.log('[INSTALL-WORKSPACES] Lien symbolique créé pour react-dom');
    } catch (err) {
      console.log(`[INSTALL-WORKSPACES] Erreur lors de la création du lien: ${err.message}`);
    }
  }
  
  if (fs.existsSync(reactLocalPath)) {
    const reactPackageJson = path.join(reactLocalPath, 'package.json');
    if (fs.existsSync(reactPackageJson)) {
      const reactPkg = JSON.parse(fs.readFileSync(reactPackageJson, 'utf8'));
      console.log(`[INSTALL-WORKSPACES] Version de React trouvée: ${reactPkg.version}`);
    }
  }
  
  // Vérification finale absolue
  const finalReactCheck = fs.existsSync(reactLocalPath);
  const finalReactDomCheck = fs.existsSync(reactDomLocalPath);
  
  console.log(`[INSTALL-WORKSPACES] Vérification ABSOLUE - React: ${finalReactCheck} (${reactLocalPath})`);
  console.log(`[INSTALL-WORKSPACES] Vérification ABSOLUE - React-dom: ${finalReactDomCheck} (${reactDomLocalPath})`);
  
  if (!finalReactCheck || !finalReactDomCheck) {
    console.error('[INSTALL-WORKSPACES] ERREUR CRITIQUE: React n\'est toujours pas disponible après toutes les tentatives!');
    console.error(`[INSTALL-WORKSPACES] React path: ${reactLocalPath}`);
    console.error(`[INSTALL-WORKSPACES] React-dom path: ${reactDomLocalPath}`);
    console.error(`[INSTALL-WORKSPACES] React à la racine: ${fs.existsSync(reactRootPath)}`);
    console.error(`[INSTALL-WORKSPACES] React-dom à la racine: ${fs.existsSync(reactDomRootPath)}`);
    process.exit(1);
  }
} else {
  console.log('[INSTALL-WORKSPACES] Installation locale dans kidoo-server...');
  process.chdir(currentDir);
  console.log(`[INSTALL-WORKSPACES] CWD après chdir: ${process.cwd()}`);
  execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('[INSTALL-WORKSPACES] Installation terminée localement');
}
console.log('[INSTALL-WORKSPACES] ==========================================');
