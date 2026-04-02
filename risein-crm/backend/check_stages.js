const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.stage.findMany({ orderBy: { order: 'asc' } });
  console.log(JSON.stringify(stages, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
