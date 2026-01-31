# Configuration Vercel pour kidoo-server

## Problème
Sur Vercel, le dossier `kidoo-shared` n'existe pas car c'est un dépôt Git séparé. Le script `install-workspaces.js` doit cloner `kidoo-shared` depuis GitHub avant l'installation des dépendances.

## Solution 1 : Git Submodules (RECOMMANDÉ) ⭐

C'est la solution la plus simple et la plus fiable.

### Étapes :

1. **Ajouter kidoo-shared comme submodule Git :**
   ```bash
   cd kidoo-server
   git submodule add https://github.com/VOTRE_USERNAME/kidoo-shared.git shared
   git commit -m "feat: Ajout de kidoo-shared comme submodule Git"
   git push
   ```

2. **Sur Vercel :**
   - Aller dans **Settings > Git**
   - Activer **"Install Git Submodules"**
   - Vercel clonera automatiquement le submodule lors du build

3. **Avantages :**
   - ✅ Pas besoin de variables d'environnement
   - ✅ Synchronisation automatique avec le dépôt
   - ✅ Solution standard et fiable

---

## Solution 2 : Cloner depuis GitHub (Alternative)

Si vous ne voulez pas utiliser de submodules, vous pouvez cloner depuis GitHub.

### Étapes :

1. **Sur Vercel, ajouter une variable d'environnement :**
   - Aller dans **Settings > Environment Variables**
   - Ajouter :
     - **Nom :** `KIDOO_SHARED_REPO`
     - **Valeur :** `VOTRE_USERNAME/kidoo-shared` (ex: `pidoff/kidoo-shared`)
     - **Environnements :** Production, Preview, Development (cocher tous)

2. **Le script `install-workspaces.js` va :**
   - Détecter que `kidoo-shared` n'existe pas
   - Cloner depuis GitHub dans `shared/`
   - Mettre à jour `package.json` pour pointer vers `file:./shared`
   - Mettre à jour `tsconfig.json` pour pointer vers `./shared`
   - Installer les dépendances

3. **Important :**
   - Le dépôt `kidoo-shared` doit être **public** ou accessible avec un token
   - Si le dépôt est privé, vous devrez configurer un token Git dans les variables d'environnement

---

## Vérification

Après le déploiement, vérifiez les logs de build sur Vercel. Vous devriez voir :
```
[INSTALL-WORKSPACES] kidoo-shared cloné avec succès dans shared/
[INSTALL-WORKSPACES] package.json mis à jour pour pointer vers shared/
[INSTALL-WORKSPACES] Installation terminée avec succès
```

---

## Dépôt privé

Si `kidoo-shared` est un dépôt privé, vous devez :

1. **Créer un Personal Access Token GitHub :**
   - GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Créer un token avec la permission `repo`

2. **Sur Vercel, ajouter :**
   - **Nom :** `GITHUB_TOKEN`
   - **Valeur :** votre token GitHub
   - Le script utilisera automatiquement ce token pour cloner

---

## Recommandation

**Utilisez Git Submodules (Solution 1)** - c'est plus simple, plus fiable, et ne nécessite pas de configuration supplémentaire sur Vercel.
