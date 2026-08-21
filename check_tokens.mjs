import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.fcmToken.findMany({
    include: {
      user: {
        select: { username: true }
      }
    }
  });
  console.log("FCM Tokens in DB:", JSON.stringify(tokens, null, 2));
}
main().finally(() => prisma.$disconnect());
