import { prisma } from "@/lib/db";
import { SEARCH_STOP_WORDS } from "./constants";

// Lazy-load the pipeline to avoid import issues in edge/server contexts
let embedder: ((text: string) => Promise<number[]>) | null = null;

async function getEmbedder() {
  if (embedder) return embedder;

  const { pipeline } = await import("@xenova/transformers");
  const pipe = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2");

  embedder = async (text: string): Promise<number[]> => {
    const result = await pipe(text, { pooling: "mean", normalize: true });
    return Array.from(result.data as Float32Array);
  };

  return embedder;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function embed(text: string): Promise<number[]> {
  const fn = await getEmbedder();
  return fn(text);
}

// ─── Serializers ────────────────────────────────────────────────────────────

export function serializeProduct(product: {
  title: string;
  description?: string | null;
  price: { toString(): string };
  category?: { name: string } | null;
  variants: Array<{
    color: { name: string };
    size: { name: string };
    sku: string;
    stock: number;
  }>;
}): string {
  const parts: string[] = [
    `Title: ${product.title}`,
    product.description ? `Description: ${product.description}` : "",
    `Price: ${product.price}`,
    product.category ? `Category: ${product.category.name}` : "",
  ];

  const variantParts = product.variants.map(
    (v) =>
      `${v.color.name} / ${v.size.name} (SKU: ${v.sku}, Stock: ${v.stock})`,
  );
  if (variantParts.length > 0) {
    parts.push(`Variants: ${variantParts.join(", ")}`);
  }

  return parts.filter(Boolean).join(". ");
}

export function serializeOrder(order: {
  id: string;
  createdAt: Date;
  status: string;
  subTotal: { toString(): string };
  tax: { toString(): string };
  total: { toString(): string };
  address: {
    street: string;
    city?: string | null;
    country?: string | null;
    zipCode?: string | null;
  };
  items: Array<{
    product: { title: string };
    colorName: string;
    sizeName: string;
    quantity: number;
    price: { toString(): string };
  }>;
}): string {
  const shortId = order.id.substring(0, 8);
  const halfId = order.id.replace(/-/g, "").substring(0, 16);
  const isoDate = order.createdAt.toISOString().split("T")[0];
  const formattedDate = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const address = [
    order.address.street,
    order.address.city,
    order.address.country,
    order.address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const productList = order.items
    .map(
      (item) =>
        `${item.product.title} (${item.colorName}, ${item.sizeName}, Quantity: ${item.quantity})`,
    )
    .join("; ");

  return [
    `Order Number: ${order.id}`,
    `Order Half ID: ${halfId}`,
    `Order Short ID: ${shortId}`,
    `Created At: ${isoDate}`,
    `Order Date: ${formattedDate}`,
    `Date Placed: ${formattedDate} (${isoDate})`,
    `Delivery Address: ${address}`,
    `Products Ordered: ${productList}`,
    `Subtotal: PKR ${order.subTotal}`,
    `Tax: PKR ${order.tax}`,
    `Total Amount: PKR ${order.total}`,
  ].join(". ");
}

// ─── Upsert Embeddings ───────────────────────────────────────────────────────

export async function upsertProductEmbedding(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      variants: { include: { color: true, size: true } },
    },
  });

  if (!product || product.deletedAt) {
    // Product soft-deleted or not found — remove embedding if exists
    await prisma.productEmbedding.deleteMany({ where: { productId } });
    return;
  }

  const content = serializeProduct(product);
  const vector = await embed(content);

  await prisma.productEmbedding.upsert({
    where: { productId },
    create: { productId, content, embedding: vector },
    update: { content, embedding: vector },
  });
}

export async function deleteProductEmbedding(productId: string): Promise<void> {
  await prisma.productEmbedding.deleteMany({ where: { productId } });
}

export async function upsertOrderEmbedding(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      address: true,
      items: { include: { product: true } },
    },
  });

  if (!order) return;

  const content = serializeOrder({
    ...order,
    subTotal: order.subTotal,
    tax: order.tax,
  });
  const vector = await embed(content);
  await prisma.orderEmbedding.upsert({
    where: { orderId },
    create: { orderId, userId: order.userId, content, embedding: vector },
    update: { content, embedding: vector },
  });
}

// ─── Semantic Search ─────────────────────────────────────────────────────────

type ProductSearchResult = {
  productId: string;
  title: string;
  description: string | null;
  price: string;
  image: string;
  category: string | null;
  variants: Array<{
    id: string;
    colorName: string;
    colorHex: string;
    sizeName: string;
    stock: number;
    sku: string;
  }>;
  score: number;
};

function mapProductToResult(
  product: {
    id: string;
    title: string;
    description: string | null;
    price: { toString(): string };
    image: string;
    category: { name: string } | null;
    variants: Array<{
      id: string;
      color: { name: string; hexCode: string };
      size: { name: string };
      stock: number;
      sku: string;
    }>;
  },
  score: number,
): ProductSearchResult {
  return {
    productId: product.id,
    title: product.title,
    description: product.description ?? null,
    price: product.price.toString(),
    image: product.image,
    category: product.category?.name ?? null,
    variants: product.variants.map((v) => ({
      id: v.id,
      colorName: v.color.name,
      colorHex: v.color.hexCode,
      sizeName: v.size.name,
      stock: v.stock,
      sku: v.sku,
    })),
    score,
  };
}

export async function searchProducts(
  query: string,
  limit = 4,
): Promise<ProductSearchResult[]> {
  const qLower = query.toLowerCase();

  // ── Price-sorted shortcut: bypass embeddings for cheapest/most-expensive ──
  const wantsExpensive =
    /\b(most expensive|highest price|priciest|costliest|highest priced)\b/i.test(
      qLower,
    );
  const wantsCheap =
    /\b(cheapest|most affordable|lowest price|least expensive|budget|cheapest product)\b/i.test(
      qLower,
    );

  if (wantsExpensive || wantsCheap) {
    const priceProducts = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { price: wantsExpensive ? "desc" : "asc" },
      take: limit,
      include: {
        category: true,
        variants: { include: { color: true, size: true } },
      },
    });
    return priceProducts.map((p) => mapProductToResult(p, 1.0));
  }

  const stopWords = new Set<string>(SEARCH_STOP_WORDS);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  // 1. Direct text search on active (non-deleted) products
  const directMatches =
    queryTerms.length > 0
      ? await prisma.product.findMany({
          where: {
            deletedAt: null,
            OR: queryTerms.flatMap((term) => [
              { title: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
              { category: { name: { contains: term, mode: "insensitive" } } },
            ]),
          },
          select: { id: true },
          take: 15,
        })
      : [];

  const directMatchIds = new Set(directMatches.map((m) => m.id));

  // 2. Vector semantic search (768d — higher threshold than 384d)
  let rawScored: Array<{ productId: string; score: number }> = [];
  try {
    const queryVector = await embed(query);
    const embeddings = await prisma.productEmbedding.findMany({
      where: { product: { deletedAt: null } },
      select: { productId: true, embedding: true },
    });

    rawScored = embeddings
      .map((e) => ({
        productId: e.productId,
        score: cosineSimilarity(queryVector, e.embedding as number[]),
      }))
      .filter((e) => e.score >= 0.35) // 768d vectors: tighter baseline
      .sort((a, b) => b.score - a.score);
  } catch (err) {
    console.error("[searchProducts embedding error]:", err);
  }

  // Combine direct matches + top 10 vector candidates
  const candidateIdSet = new Set<string>(directMatchIds);
  for (const s of rawScored.slice(0, 10)) {
    candidateIdSet.add(s.productId);
  }

  // No fallback to random products — if nothing matched, return empty
  if (candidateIdSet.size === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(candidateIdSet) }, deletedAt: null },
    include: {
      category: true,
      variants: { include: { color: true, size: true } },
    },
  });

  const vectorScoreMap = new Map(rawScored.map((s) => [s.productId, s.score]));

  const scored = products
    .map((product) => {
      const baseVectorScore = vectorScoreMap.get(product.id) ?? 0;
      let textBoost = 0;
      const titleLower = product.title.toLowerCase();
      const catLower = product.category?.name?.toLowerCase() ?? "";
      const descLower = product.description?.toLowerCase() ?? "";

      for (const term of queryTerms) {
        const wordRegex = new RegExp(`\\b${term}`, "i");
        if (wordRegex.test(titleLower)) textBoost += 0.4;
        else if (titleLower.includes(term)) textBoost += 0.25;
        if (wordRegex.test(catLower)) textBoost += 0.2;
        if (wordRegex.test(descLower)) textBoost += 0.1;
      }
      if (directMatchIds.has(product.id)) textBoost += 0.3;

      return mapProductToResult(product, baseVectorScore + textBoost);
    })
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  // Must score >= 0.35 absolute AND >= 55% of top score
  const threshold = Math.max(0.35, topScore * 0.55);
  return scored.filter((item) => item.score >= threshold).slice(0, limit);
}

function formatOrderResponse(
  order: {
    id: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    subTotal: { toString(): string };
    tax: { toString(): string };
    total: { toString(): string };
    createdAt: Date;
    address: {
      street: string;
      city?: string | null;
      country?: string | null;
      zipCode?: string | null;
    };
    items: Array<{
      product: { title: string };
      colorName: string;
      sizeName: string;
      quantity: number;
      price: { toString(): string };
    }>;
  },
  score: number,
) {
  const address = [
    order.address.street,
    order.address.city,
    order.address.country,
    order.address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    orderId: order.id,
    shortId: order.id.substring(0, 8),
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus:
      order.paymentMethod === "CASH_ON_DELIVERY" ? null : order.paymentStatus,
    subTotal: order.subTotal.toString(),
    tax: order.tax.toString(),
    total: order.total.toString(),
    createdAt: order.createdAt.toISOString(),
    address,
    items: order.items.map((item) => ({
      title: item.product.title,
      colorName: item.colorName,
      sizeName: item.sizeName,
      quantity: item.quantity,
      price: item.price.toString(),
    })),
    score,
  };
}

export async function searchUserOrders(
  query: string,
  userId: string,
  limit = 3,
): Promise<ReturnType<typeof formatOrderResponse>[]> {
  const qClean = query.trim();

  // 1. Direct query: Check for order ID / Short ID (e.g. #1208e930, 1208e930, full uuid)
  const idMatch = qClean.match(/#?([0-9a-f]{6,36})/i);
  if (idMatch) {
    const idPrefix = idMatch[1].toLowerCase();
    const directOrders = await prisma.order.findMany({
      where: {
        userId,
        id: { startsWith: idPrefix },
      },
      include: {
        address: true,
        items: { include: { product: true } },
      },
      take: limit,
    });

    if (directOrders.length > 0) {
      return directOrders.map((o) => formatOrderResponse(o, 1.0));
    }
  }

  // 2. Direct query: Date-based inquiry (today, yesterday, this week)
  const qLower = qClean.toLowerCase();
  const isTodayInquiry = /\b(today|today's)\b/i.test(qLower);
  const isYesterdayInquiry = /\b(yesterday|yesterday's)\b/i.test(qLower);
  const isWeekInquiry = /\b(this week|past week|last 7 days)\b/i.test(qLower);

  if (isTodayInquiry) {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const todayOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: startOfToday },
      },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: { include: { product: true } },
      },
      take: 20,
    });
    return todayOrders.map((o) => formatOrderResponse(o, 1.0));
  }

  if (isYesterdayInquiry) {
    const now = new Date();
    const startOfToday = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
      ),
    );
    const startOfYesterday = new Date(
      startOfToday.getTime() - 24 * 60 * 60 * 1000,
    );
    const yesterdayOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: startOfYesterday, lt: startOfToday },
      },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: { include: { product: true } },
      },
      take: 20,
    });
    return yesterdayOrders.map((o) => formatOrderResponse(o, 1.0));
  }

  if (isWeekInquiry) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { gte: weekAgo },
      },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: { include: { product: true } },
      },
      take: 20,
    });
    return weekOrders.map((o) => formatOrderResponse(o, 1.0));
  }

  // 3. Direct query: Count or general recent orders inquiry
  const isPreviousOrderInquiry =
    /\b(previous orders?|past orders?|prior orders?|last orders?|what about my (previous|last|past|recent) orders?)\b/i.test(
      qClean,
    );
  const isGeneralInquiry =
    isPreviousOrderInquiry ||
    /\b(where is my order|show my orders?|my orders?|recent orders?|latest orders?|order status|track my order|orders? list|what did i buy|items i bought|how many orders?|order count|total orders?|order history)\b/i.test(
      qClean,
    );
  if (isGeneralInquiry) {
    const takeCount = isPreviousOrderInquiry ? 3 : Math.max(limit, 10);
    const recentOrders = await prisma.order.findMany({
      where: {
        userId,
        createdAt: { lte: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        address: true,
        items: { include: { product: true } },
      },
      take: takeCount,
    });

    if (recentOrders.length > 0) {
      return recentOrders.map((o) => formatOrderResponse(o, 0.95));
    }
  }

  // 4. Hybrid Semantic Search
  const queryVector = await embed(query);
  const embeddings = await prisma.orderEmbedding.findMany({
    where: { userId },
    select: { orderId: true, embedding: true },
  });

  if (embeddings.length === 0) return [];

  const rawScored = embeddings
    .map((e) => ({
      orderId: e.orderId,
      score: cosineSimilarity(queryVector, e.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score);

  const candidateIds = rawScored.slice(0, 10).map((s) => s.orderId);
  const candidateOrders = await prisma.order.findMany({
    where: { id: { in: candidateIds }, userId },
    include: {
      address: true,
      items: { include: { product: true } },
    },
  });

  const stopWords = new Set<string>(SEARCH_STOP_WORDS);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !stopWords.has(t));

  const scored = rawScored
    .slice(0, 10)
    .map((s) => {
      const order = candidateOrders.find((o) => o.id === s.orderId);
      if (!order) return null;

      let boost = 0;
      const titles = order.items
        .map((i) => i.product.title.toLowerCase())
        .join(" ");
      const addr =
        `${order.address.street} ${order.address.city || ""} ${order.address.country || ""}`.toLowerCase();

      for (const term of queryTerms) {
        const regex = new RegExp(`\\b${term}`, "i");
        if (regex.test(titles)) boost += 0.25;
        if (regex.test(addr)) boost += 0.15;
      }

      return {
        order,
        score: s.score + boost,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  const topScore = scored[0].score;
  const threshold = Math.max(0.28, topScore * 0.65);

  return scored
    .filter((item) => item.score >= threshold)
    .slice(0, limit)
    .map((item) => formatOrderResponse(item.order, item.score));
}
