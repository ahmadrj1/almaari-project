/**
 * Deletes all ProductEmbedding and OrderEmbedding rows, then regenerates
 * them using the 768d all-mpnet-base-v2 model.
 *
 * Run with:
 *   npx tsx scripts/regenerate-embeddings.ts
 */

import { prisma } from "../lib/db";
import {
  upsertProductEmbedding,
  upsertOrderEmbedding,
} from "../lib/embedding.service";

async function main() {
  // 1. Delete all existing embeddings
  const [deletedProducts, deletedOrders] = await Promise.all([
    prisma.productEmbedding.deleteMany(),
    prisma.orderEmbedding.deleteMany(),
  ]);
  console.log(
    `Deleted ${deletedProducts.count} product embeddings, ${deletedOrders.count} order embeddings.`,
  );

  // 2. Regenerate product embeddings (active products only)
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });
  console.log(`Regenerating embeddings for ${products.length} products…`);
  for (const { id } of products) {
    await upsertProductEmbedding(id);
    process.stdout.write(".");
  }
  console.log("\nProduct embeddings done.");

  // 3. Regenerate order embeddings (all orders)
  const orders = await prisma.order.findMany({
    select: { id: true },
  });
  console.log(`Regenerating embeddings for ${orders.length} orders…`);
  for (const { id } of orders) {
    await upsertOrderEmbedding(id);
    process.stdout.write(".");
  }
  console.log("\nOrder embeddings done.");

  await prisma.$disconnect();
  console.log("All done ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
