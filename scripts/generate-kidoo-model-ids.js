/**
 * Génère firmware/modelIds.generated.ts dans kidoo-shared à partir de l'enum
 * KidooModel du schéma Prisma. Permet d'utiliser l'enum Prisma comme source
 * de vérité sans importer le client Prisma dans l'app (React Native).
 */

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');

const sharedDirCandidates = [
  path.join(__dirname, '../../kidoo-shared'),
  path.join(__dirname, '../kidoo-shared'),
  path.join(__dirname, '../../shared'),
  path.join(__dirname, '../shared'),
];

const sharedRoot = sharedDirCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'firmware'))
);

if (!sharedRoot) {
  throw new Error(
    'Impossible de localiser kidoo-shared. Vérifiez que le dépôt est disponible (../kidoo-shared ou ./shared).'
  );
}

const outputPath = path.join(sharedRoot, 'firmware/modelIds.generated.ts');

const schema = fs.readFileSync(schemaPath, 'utf8');

// Extraire les valeurs de enum KidooModel { ... }
const enumMatch = schema.match(/enum\s+KidooModel\s*\{([^}]+)\}/);
if (!enumMatch) {
  throw new Error('enum KidooModel not found in schema.prisma');
}

const values = enumMatch[1]
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('//'))
  .map((line) => line.replace(/,?\s*$/, '').trim());

if (values.length === 0) {
  throw new Error('KidooModel enum has no values');
}

const content = `/**
 * Auto-généré depuis prisma/schema.prisma (enum KidooModel).
 * Ne pas modifier à la main. Exécuter \`npm run db:generate\` dans kidoo-server.
 */

export const KIDOO_MODEL_IDS = ${JSON.stringify(values)} as [string, ...string[]];
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content, 'utf8');
console.log('Generated', outputPath, 'with', values.length, 'model(s):', values.join(', '));
