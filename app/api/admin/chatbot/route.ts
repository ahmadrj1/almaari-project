import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import Groq from "groq-sdk";
import { CHATBOT_CONTEXT_PAIRS_LIMIT } from "@/lib/constants";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = process.env.GROQ_CHAT_MODEL ?? "qwen/qwen3.8-27b";

const ADMIN_SYSTEM_PROMPT = `You are the Almaari Admin AI Assistant.
You provide executive-level analytics, sales metrics, order intelligence, and inventory insights to store administrators.

ADMIN RULES:
- You have full access to store administrative analytics provided in the injected CONTEXT.
- Answer questions accurately using only the data provided in the CONTEXT. If specific data is not available, state so clearly.
- Format responses cleanly with bold numbers, bullet points, or markdown tables when displaying breakdowns.
- NEVER perform add-to-cart operations and NEVER emit cart tags. Admins do not shop via this interface.
- Keep responses professional, concise, actionable, and data-driven.`;

async function fetchAdminContext(message: string): Promise<string> {
  const query = message.toLowerCase();
  const contextParts: string[] = [];

  const asksOrderStatus =
    query.includes("status") ||
    query.includes("how many orders") ||
    query.includes("order count") ||
    query.includes("orders count");
  const asksPaymentMethod =
    query.includes("cod") ||
    query.includes("cash on delivery") ||
    query.includes("card") ||
    query.includes("payment");
  const asksRevenue =
    query.includes("revenue") ||
    query.includes("sales") ||
    query.includes("earning") ||
    query.includes("total money") ||
    query.includes("turnover");
  const asksUserOrders =
    query.includes("user") ||
    query.includes("customer") ||
    query.includes("ordered how many") ||
    query.includes("most orders") ||
    query.includes("top customer");
  const asksDateOrders =
    query.includes("today") ||
    query.includes("yesterday") ||
    query.includes("day") ||
    query.includes("date") ||
    /\b(20\d\d[-/]\d\d[-/]\d\d|\bjan|\bfeb|\bmar|\bapr|\bmay|\bjun|\bjul|\baug|\bsep|\boct|\bnov|\bdec)\b/i.test(
      query,
    );
  const asksLowStock =
    query.includes("stock") ||
    query.includes("out of stock") ||
    query.includes("low stock") ||
    query.includes("almost out") ||
    query.includes("inventory");
  const asksUnsold =
    query.includes("not sold") ||
    query.includes("unsold") ||
    query.includes("never sold") ||
    query.includes("zero sales") ||
    query.includes("no sales");

  // If general or broad, load high-level metrics
  const isGeneral =
    !asksOrderStatus &&
    !asksPaymentMethod &&
    !asksRevenue &&
    !asksUserOrders &&
    !asksDateOrders &&
    !asksLowStock &&
    !asksUnsold;

  try {
    // 1. Order Status Breakdown
    if (asksOrderStatus || isGeneral) {
      const statusCounts = await prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { total: true },
      });
      const totalCount = statusCounts.reduce((acc, s) => acc + s._count.id, 0);
      contextParts.push(
        `[ORDER STATUS BREAKDOWN] Total Orders: ${totalCount}\n` +
          statusCounts
            .map(
              (s) =>
                `- Status: ${s.status} | Count: ${s._count.id} | Total Value: PKR ${s._sum.total ?? 0}`,
            )
            .join("\n"),
      );
    }

    // 2. Payment Method / COD vs Card
    if (asksPaymentMethod || asksRevenue || isGeneral) {
      const paymentSummary = await prisma.order.groupBy({
        by: ["paymentMethod"],
        _count: { id: true },
        _sum: { total: true },
      });
      contextParts.push(
        `[PAYMENT METHOD BREAKDOWN]\n` +
          paymentSummary
            .map(
              (p) =>
                `- Method: ${p.paymentMethod} | Orders: ${p._count.id} | Total Amount: PKR ${p._sum.total ?? 0}`,
            )
            .join("\n"),
      );
    }

    // 3. Overall Revenue
    if (asksRevenue || isGeneral) {
      const totalAgg = await prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
      });
      const completedAgg = await prisma.order.aggregate({
        where: { status: { not: "CANCELLED" } },
        _sum: { total: true },
      });
      contextParts.push(
        `[REVENUE METRICS]\n- Total Gross Revenue (All Orders): PKR ${totalAgg._sum.total ?? 0} across ${totalAgg._count.id} orders\n- Net Revenue (Excluding Cancelled): PKR ${completedAgg._sum.total ?? 0}`,
      );
    }

    // 4. User Orders (Which user ordered how many times)
    if (asksUserOrders) {
      const userOrders = await prisma.order.groupBy({
        by: ["userId"],
        _count: { id: true },
        _sum: { total: true },
        orderBy: { _count: { id: "desc" } },
        take: 15,
      });

      const userIds = userOrders.map((u) => u.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      contextParts.push(
        `[TOP CUSTOMERS BY ORDER COUNT]\n` +
          userOrders
            .map((u, i) => {
              const profile = userMap.get(u.userId);
              const label = profile
                ? `${profile.fullName || "Anonymous"} (${profile.email})`
                : `User ID: ${u.userId}`;
              return `${i + 1}. ${label} — ${u._count.id} orders (Total spent: PKR ${u._sum.total ?? 0})`;
            })
            .join("\n"),
      );
    }

    // 5. Orders by date / Day
    if (asksDateOrders) {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

      const [todayCount, todaySum, yesterdayCount, yesterdaySum] =
        await Promise.all([
          prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
          prisma.order.aggregate({
            where: { createdAt: { gte: startOfToday } },
            _sum: { total: true },
          }),
          prisma.order.count({
            where: {
              createdAt: { gte: startOfYesterday, lt: startOfToday },
            },
          }),
          prisma.order.aggregate({
            where: {
              createdAt: { gte: startOfYesterday, lt: startOfToday },
            },
            _sum: { total: true },
          }),
        ]);

      // Recent 10 orders for context
      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { fullName: true, email: true } },
        },
      });

      contextParts.push(
        `[ORDERS BY DATE]\n- Today's Orders: ${todayCount} (Revenue: PKR ${todaySum._sum.total ?? 0})\n- Yesterday's Orders: ${yesterdayCount} (Revenue: PKR ${yesterdaySum._sum.total ?? 0})\nRecent Orders:\n` +
          recentOrders
            .map(
              (o) =>
                `- Order #${o.id.substring(0, 8)} on ${o.createdAt.toISOString().split("T")[0]} | Status: ${o.status} | PKR ${o.total} | ${o.user?.email || "Unknown"}`,
            )
            .join("\n"),
      );
    }

    // 6. Low stock products (variant stock <= 5)
    if (asksLowStock || isGeneral) {
      const lowStockProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          variants: { some: { stock: { lte: 5 } } },
        },
        select: {
          id: true,
          title: true,
          category: { select: { name: true } },
          variants: {
            where: { stock: { lte: 5 } },
            select: {
              sku: true,
              stock: true,
              color: { select: { name: true } },
              size: { select: { name: true } },
            },
          },
        },
        take: 20,
      });

      if (lowStockProducts.length > 0) {
        contextParts.push(
          `[LOW STOCK / OUT OF STOCK PRODUCTS (Stock <= 5)]\n` +
            lowStockProducts
              .map((p) => {
                const vars = p.variants
                  .map(
                    (v) =>
                      `${v.color.name}/${v.size.name} (SKU: ${v.sku}, Stock: ${v.stock})`,
                  )
                  .join(", ");
                return `- Product: ${p.title} (${p.category?.name || "No Category"}) | Low Stock Variants: ${vars}`;
              })
              .join("\n"),
        );
      } else {
        contextParts.push(
          `[LOW STOCK PRODUCTS] No products currently have stock <= 5. All items are adequately stocked.`,
        );
      }
    }

    // 7. Unsold products (Zero sales)
    if (asksUnsold) {
      const unsoldProducts = await prisma.product.findMany({
        where: {
          deletedAt: null,
          orderItems: { none: {} },
        },
        select: {
          id: true,
          title: true,
          price: true,
          category: { select: { name: true } },
          variants: {
            select: {
              sku: true,
              stock: true,
            },
          },
        },
        take: 20,
      });

      if (unsoldProducts.length > 0) {
        contextParts.push(
          `[UNSOLD PRODUCTS (Zero Orders to Date)] Total found: ${unsoldProducts.length}\n` +
            unsoldProducts
              .map((p) => {
                const totalStock = p.variants.reduce(
                  (sum, v) => sum + v.stock,
                  0,
                );
                return `- ${p.title} (${p.category?.name || "General"}) | Price: PKR ${p.price} | Total Stock: ${totalStock}`;
              })
              .join("\n"),
        );
      } else {
        contextParts.push(
          `[UNSOLD PRODUCTS] All active products in the store have at least one sale!`,
        );
      }
    }
  } catch (dbError) {
    console.error("[ADMIN CHATBOT DB QUERY ERROR]:", dbError);
  }

  return contextParts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json();
  const { message, sessionId } = body as {
    message: string;
    sessionId?: string;
  };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Session resolution
  let chatSession = sessionId
    ? await prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      })
    : null;

  const isNewSession = !chatSession;
  if (!chatSession) {
    chatSession = await prisma.chatSession.create({
      data: { userId, title: `Admin Query: ${message.slice(0, 30)}` },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  const allMessages = chatSession.messages ?? [];
  const contextMessages = allMessages.slice(-CHATBOT_CONTEXT_PAIRS_LIMIT * 2);

  // Intent queries & analytics injection
  const adminContext = await fetchAdminContext(message);

  const groqMessages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [{ role: "system", content: ADMIN_SYSTEM_PROMPT }];

  if (adminContext) {
    groqMessages.push({
      role: "system",
      content: `CURRENT DATABASE ANALYTICS CONTEXT:\n${adminContext}`,
    });
  }

  for (const msg of contextMessages) {
    groqMessages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  }

  groqMessages.push({ role: "user", content: message });

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: groqMessages,
      temperature: 0.2,
      max_tokens: 1024,
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      "I was unable to retrieve a response.";

    // Persist messages
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { sessionId: chatSession.id, role: "user", content: message },
      }),
      prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          role: "assistant",
          content: reply,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        message: reply,
        sessionId: chatSession.id,
        sessionTitle: chatSession.title,
        isNewSession,
      },
    });
  } catch (error) {
    console.error("[ADMIN CHATBOT ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 },
    );
  }
}
