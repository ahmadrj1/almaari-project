/**
 * One-off script to generate embeddings for all existing products and orders.
 * Run with: npx tsx scripts/sync-embeddings.ts
 */
import { prisma } from "../lib/db";
import {
  upsertProductEmbedding,
  upsertOrderEmbedding,
} from "../lib/embedding.service";

async function syncProducts() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true },
  });
  console.log(`Syncing ${products.length} products...`);
  let done = 0;
  for (const p of products) {
    try {
      await upsertProductEmbedding(p.id);
      done++;
      process.stdout.write(`\r  Products: ${done}/${products.length}`);
    } catch (err) {
      console.error(`\n  ✗ Product ${p.title}: ${err}`);
    }
  }
  console.log(`\n  ✓ Products done.`);
}

async function syncOrders() {
  const orders = await prisma.order.findMany({
    select: { id: true },
  });
  console.log(`Syncing ${orders.length} orders...`);
  let done = 0;
  for (const o of orders) {
    try {
      await upsertOrderEmbedding(o.id);
      done++;
      process.stdout.write(`\r  Orders: ${done}/${orders.length}`);
    } catch (err) {
      console.error(`\n  ✗ Order ${o.id}: ${err}`);
    }
  }
  console.log(`\n  ✓ Orders done.`);
}

async function main() {
  console.log("=== Embedding Sync ===");
  console.log("Clearing existing embeddings...");
  await prisma.productEmbedding.deleteMany();
  await prisma.orderEmbedding.deleteMany();
  console.log("✓ Cleared existing embeddings.");
  await syncProducts();
  await syncOrders();
  await prisma.$disconnect();
  console.log("=== Done ===");
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
