import { PrismaClient } from "@prisma/client";
import {
  extractTitlePrefix,
  resolveColorCode,
  generateVariantSku,
} from "../lib/sku";

const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting SKU and Code database backfill...");

  // 1. Ensure columns exist via raw SQL
  await prisma.$executeRawUnsafe(`ALTER TABLE "Color" ADD COLUMN IF NOT EXISTS "code" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "titlePrefix" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "code" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "sku" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "sku" TEXT`);

  // 2. Backfill Colors
  console.log("Backfilling Colors...");
  const colors = await prisma.color.findMany();
  const usedColorCodes = new Set<string>();

  for (const c of colors) {
    let code = resolveColorCode(c.name);
    let counter = 1;
    while (usedColorCodes.has(code)) {
      code = `${code.slice(0, 2)}${counter++}`;
    }
    usedColorCodes.add(code);
    await prisma.$executeRawUnsafe(
      `UPDATE "Color" SET "code" = $1 WHERE "id" = $2`,
      code,
      c.id,
    );
    console.log(`  Color: ${c.name} -> ${code}`);
  }

  // 3. Backfill Products
  console.log("Backfilling Products...");
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
  });

  const prefixCounters = new Map<string, number>();

  for (const prod of products) {
    const prefix = extractTitlePrefix(prod.title);
    const nextSeq = (prefixCounters.get(prefix) || 0) + 1;
    prefixCounters.set(prefix, nextSeq);
    const code = String(nextSeq).padStart(3, "0");

    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET "titlePrefix" = $1, "code" = $2 WHERE "id" = $3`,
      prefix,
      code,
      prod.id,
    );
  }
  console.log(`  Backfilled ${products.length} products.`);

  // 4. Backfill Product Variants
  console.log("Backfilling ProductVariants...");
  const updatedColors = await prisma.color.findMany();
  const colorMap = new Map(updatedColors.map((c) => [c.id, (c as unknown as { code: string }).code || "DEF"]));

  const updatedProducts = await prisma.product.findMany();
  const productMap = new Map(
    updatedProducts.map((p) => [
      p.id,
      {
        titlePrefix: (p as unknown as { titlePrefix: string }).titlePrefix || extractTitlePrefix(p.title),
        code: (p as unknown as { code: string }).code || "001",
      },
    ]),
  );

  const variants = await prisma.productVariant.findMany({
    include: { size: true },
  });

  const usedSkus = new Set<string>();

  for (const v of variants) {
    const prodInfo = productMap.get(v.productId) || {
      titlePrefix: "PROD",
      code: "001",
    };
    const colCode = colorMap.get(v.colorId) || "DEF";
    const sizeCode = v.size?.name || "STD";

    let sku = generateVariantSku(
      prodInfo.titlePrefix,
      prodInfo.code,
      sizeCode,
      colCode,
    );

    let dupCounter = 1;
    while (usedSkus.has(sku)) {
      sku = `${generateVariantSku(prodInfo.titlePrefix, prodInfo.code, sizeCode, colCode)}-${dupCounter++}`;
    }
    usedSkus.add(sku);

    await prisma.$executeRawUnsafe(
      `UPDATE "ProductVariant" SET "sku" = $1 WHERE "id" = $2`,
      sku,
      v.id,
    );
  }
  console.log(`  Backfilled ${variants.length} product variants.`);

  // 5. Backfill Order Items
  console.log("Backfilling OrderItems...");
  const updatedVariants = await prisma.productVariant.findMany({
    include: { color: true, size: true },
  });

  const orderItems = await prisma.orderItem.findMany();
  let orderItemsUpdated = 0;

  for (const item of orderItems) {
    const matchedVariant = updatedVariants.find(
      (v) =>
        v.productId === item.productId &&
        v.color.name.toLowerCase() === item.colorName.toLowerCase() &&
        v.size.name.toLowerCase() === item.sizeName.toLowerCase(),
    );

    const sku =
      (matchedVariant as unknown as { sku?: string })?.sku ||
      generateVariantSku(
        extractTitlePrefix("PROD"),
        "001",
        item.sizeName,
        resolveColorCode(item.colorName),
      );

    await prisma.$executeRawUnsafe(
      `UPDATE "OrderItem" SET "sku" = $1 WHERE "id" = $2`,
      sku,
      item.id,
    );
    orderItemsUpdated++;
  }
  console.log(`  Backfilled ${orderItemsUpdated} order items.`);

  // 6. Apply constraints and unique indexes
  console.log("Enforcing NOT NULL and UNIQUE constraints...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Color" ALTER COLUMN "code" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Color_code_key" ON "Color"("code")`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "titlePrefix" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ALTER COLUMN "code" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Product_titlePrefix_code_key" ON "Product"("titlePrefix", "code")`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "ProductVariant" ALTER COLUMN "sku" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_sku_key" ON "ProductVariant"("sku")`);

  console.log("Database backfill completed successfully!");
}

backfill()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
