/**
 * Seeds the Exercise table from the Jefit-derived exercise fixture
 * (prisma/exercise_seed.json). Safe to re-run: clears existing rows first.
 *
 * Usage: npm run prisma:seed:exercises -w @gymerr/backend
 */
import { PrismaClient } from "@prisma/client";
import seedData from "./exercise_seed.json" with { type: "json" };

const prisma = new PrismaClient();

async function main() {
  await prisma.exercise.deleteMany();
  const result = await prisma.exercise.createMany({ data: seedData as any });
  console.log(`Inserted ${result.count} exercises`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
