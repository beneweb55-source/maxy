import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const t0 = Date.now();
  try {
    const updated = await prisma.user.update({
      where: { id: 3 },
      data: { login_attempts: 0 }
    });
    console.log("Updated in", Date.now() - t0, "ms:", updated);
  } catch (e) {
    console.error("Error in", Date.now() - t0, "ms:", e);
  }
}
main();
