import 'dotenv/config';
import { prisma } from '../lib/prisma';

const BASE_EMOTIONS = [
  { key: 'HOT', label: 'Chaud' },
  { key: 'OK', label: 'OK / Neutre' },
  { key: 'COLD', label: 'Froid' },
  { key: 'BRUSH', label: 'Brossage' },
  { key: 'SLEEP', label: 'Dodo' },
  { key: 'HAPPY', label: 'Content' },
  { key: 'SAD', label: 'Triste' },
  { key: 'SURPRISE', label: 'Surprise' },
  { key: 'HUNGRY', label: 'Faim' },
  { key: 'SICK', label: 'Malade' },
] as const;

async function main() {
  console.log('Seeding base emotions...');
  for (const { key, label } of BASE_EMOTIONS) {
    await prisma.emotion.upsert({
      where: { key },
      create: { key, label },
      update: { label },
    });
  }
  console.log(`Seeded ${BASE_EMOTIONS.length} emotions.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
