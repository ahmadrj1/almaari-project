import { prisma } from "@/lib/db";
import Groq from "groq-sdk";
import {
  ADMIN_CHATBOT_MAX_TOKENS,
  CHATBOT_TEMPERATURE,
  CHATBOT_TOP_P,
  STORE_KNOWLEDGE,
} from "@/lib/constants";

const isGemini = Boolean(process.env.GEMINI_API_KEY);
const groq = new Groq({
  apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || "",
  baseURL: isGemini
    ? "https://generativelanguage.googleapis.com/v1beta"
    : undefined,
});
const MODEL =
  process.env.GEMINI_CHAT_MODEL ||
  process.env.GROQ_CHAT_MODEL ||
  (isGemini ? "gemini-3.5-flash-lite" : "qwen/qwen3.8-27b");

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildAdminSystemPrompt(): string {
  const now = new Date();
  const localDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Karachi",
  });
  const localTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });

  return `You are the Almaari Admin AI Assistant.
You provide executive-level analytics, sales metrics, order intelligence, and inventory insights to store administrators.

CURRENT DATE & TIME:
- UTC: ${now.toISOString()}
- Local (PKT, Asia/Karachi): ${localDate} at ${localTime}
- Use this as your reference for ALL relative time expressions (today, yesterday, last 7 days, last month, etc.)

ADMIN RULES:
- You have full access to store administrative analytics provided in the injected CONTEXT.
- Answer questions accurately using only the data provided in the CONTEXT. If specific data is not available, state so clearly.
- When order counts or breakdowns by date are in the CONTEXT, use them directly — do not say you cannot determine the answer.
- Format responses cleanly with bold numbers, bullet points, or markdown tables when displaying breakdowns.
- NEVER perform add-to-cart operations and NEVER emit cart tags. Admins do not shop via this interface.
- Keep responses professional, concise, actionable, and data-driven.

${STORE_KNOWLEDGE}`;
}

// ─── Date Range Parser ────────────────────────────────────────────────────────

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseFlexDate(raw: string): Date | null {
  const trimmed = raw.trim();

  const iso = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso)
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));

  const ordinal1 = trimmed.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i,
  );
  if (ordinal1) {
    const month = MONTH_MAP[ordinal1[2].toLowerCase()];
    if (month !== undefined)
      return new Date(parseInt(ordinal1[3]), month, parseInt(ordinal1[1]));
  }

  const ordinal2 = trimmed.match(
    /^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i,
  );
  if (ordinal2) {
    const month = MONTH_MAP[ordinal2[1].toLowerCase()];
    if (month !== undefined)
      return new Date(parseInt(ordinal2[3]), month, parseInt(ordinal2[2]));
  }

  return null;
}

export function parseDateRange(message: string, now: Date): DateRange | null {
  const q = message.toLowerCase();

  const lastNDaysMatch = q.match(/(?:last|past)\s+(\d+)\s+days?/);
  if (lastNDaysMatch) {
    const n = parseInt(lastNDaysMatch[1]);
    const start = new Date(now.getTime() - n * 86400000);
    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: `last ${n} days`,
    };
  }

  const lastNWeeksMatch = q.match(/(?:last|past)\s+(\d+)\s+weeks?/);
  if (lastNWeeksMatch) {
    const n = parseInt(lastNWeeksMatch[1]);
    const start = new Date(now.getTime() - n * 7 * 86400000);
    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: `last ${n} weeks`,
    };
  }

  const lastNMonthsMatch = q.match(/(?:last|past)\s+(\d+)\s+months?/);
  if (lastNMonthsMatch) {
    const n = parseInt(lastNMonthsMatch[1]);
    const start = new Date(
      now.getFullYear(),
      now.getMonth() - n,
      now.getDate(),
    );
    return {
      start: startOfDay(start),
      end: endOfDay(now),
      label: `last ${n} months`,
    };
  }

  if (/last\s+week/.test(q)) {
    const dow = now.getDay();
    const startOfThisWeek = startOfDay(
      new Date(now.getTime() - dow * 86400000),
    );
    const startOfLastWeek = new Date(startOfThisWeek.getTime() - 7 * 86400000);
    const endOfLastWeek = new Date(startOfThisWeek.getTime() - 1);
    return { start: startOfLastWeek, end: endOfLastWeek, label: "last week" };
  }

  if (/this\s+week/.test(q)) {
    const dow = now.getDay();
    const startOfThisWeek = startOfDay(
      new Date(now.getTime() - dow * 86400000),
    );
    return { start: startOfThisWeek, end: endOfDay(now), label: "this week" };
  }

  if (/last\s+month/.test(q)) {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(firstOfThisMonth.getTime() - 1);
    return {
      start: firstOfLastMonth,
      end: endOfLastMonth,
      label: "last month",
    };
  }

  if (/this\s+month/.test(q)) {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: firstOfThisMonth, end: endOfDay(now), label: "this month" };
  }

  const rangePatterns = [
    /from\s+(.+?)\s+to\s+(.+?)(?:\?|$)/i,
    /between\s+(.+?)\s+and\s+(.+?)(?:\?|$)/i,
  ];

  for (const pattern of rangePatterns) {
    const m = message.match(pattern);
    if (m) {
      const d1 = parseFlexDate(m[1].trim());
      const d2 = parseFlexDate(m[2].trim());
      if (d1 && d2) {
        const [start, end] = d1 <= d2 ? [d1, d2] : [d2, d1];
        return {
          start: startOfDay(start),
          end: endOfDay(end),
          label: `${start.toDateString()} to ${end.toDateString()}`,
        };
      }
    }
  }

  const toMatch = message.match(
    /(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+to\s+(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
  );
  if (toMatch) {
    const d1 = parseFlexDate(toMatch[1]);
    const d2 = parseFlexDate(toMatch[2]);
    if (d1 && d2) {
      const [start, end] = d1 <= d2 ? [d1, d2] : [d2, d1];
      return {
        start: startOfDay(start),
        end: endOfDay(end),
        label: `${start.toDateString()} to ${end.toDateString()}`,
      };
    }
  }

  return null;
}

// ─── Context Fetcher ──────────────────────────────────────────────────────────

export async function fetchAdminContext(
  message: string,
  now: Date,
): Promise<string> {
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
    query.includes("week") ||
    query.includes("month") ||
    query.includes("last") ||
    query.includes("past") ||
    query.includes("between") ||
    query.includes(" to ") ||
    query.includes("from ") ||
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

  const isGeneral =
    !asksOrderStatus &&
    !asksPaymentMethod &&
    !asksRevenue &&
    !asksUserOrders &&
    !asksDateOrders &&
    !asksLowStock &&
    !asksUnsold;

  try {
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

    if (asksRevenue || isGeneral) {
      const [totalAgg, completedAgg] = await Promise.all([
        prisma.order.aggregate({ _sum: { total: true }, _count: { id: true } }),
        prisma.order.aggregate({
          where: { status: { not: "CANCELLED" } },
          _sum: { total: true },
        }),
      ]);
      contextParts.push(
        `[REVENUE METRICS]\n- Total Gross Revenue (All Orders): PKR ${totalAgg._sum.total ?? 0} across ${totalAgg._count.id} orders\n- Net Revenue (Excluding Cancelled): PKR ${completedAgg._sum.total ?? 0}`,
      );
    }

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

    if (asksDateOrders) {
      const startOfToday = startOfDay(now);
      const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

      const [todayCount, todaySum, yesterdayCount, yesterdaySum] =
        await Promise.all([
          prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
          prisma.order.aggregate({
            where: { createdAt: { gte: startOfToday } },
            _sum: { total: true },
          }),
          prisma.order.count({
            where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
          }),
          prisma.order.aggregate({
            where: { createdAt: { gte: startOfYesterday, lt: startOfToday } },
            _sum: { total: true },
          }),
        ]);

      let dateContextStr =
        `[ORDERS BY DATE]\n` +
        `- Today (${now.toISOString().split("T")[0]}): ${todayCount} orders (Revenue: PKR ${todaySum._sum.total ?? 0})\n` +
        `- Yesterday (${startOfYesterday.toISOString().split("T")[0]}): ${yesterdayCount} orders (Revenue: PKR ${yesterdaySum._sum.total ?? 0})`;

      const range = parseDateRange(message, now);
      if (range) {
        const [rangeCount, rangeSum, ordersInRange] = await Promise.all([
          prisma.order.count({
            where: { createdAt: { gte: range.start, lte: range.end } },
          }),
          prisma.order.aggregate({
            where: { createdAt: { gte: range.start, lte: range.end } },
            _sum: { total: true },
          }),
          prisma.order.findMany({
            where: { createdAt: { gte: range.start, lte: range.end } },
            select: { createdAt: true, total: true },
            orderBy: { createdAt: "asc" },
          }),
        ]);

        const byDay: Record<string, { count: number; revenue: number }> = {};
        for (const o of ordersInRange) {
          const key = o.createdAt.toISOString().split("T")[0];
          if (!byDay[key]) byDay[key] = { count: 0, revenue: 0 };
          byDay[key].count++;
          byDay[key].revenue += Number(o.total);
        }

        const breakdown = Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, d]) => `  ${date}: ${d.count} orders (PKR ${d.revenue})`)
          .join("\n");

        dateContextStr +=
          `\n\n[DATE RANGE QUERY: ${range.label}]\n` +
          `- Range: ${range.start.toISOString().split("T")[0]} to ${range.end.toISOString().split("T")[0]}\n` +
          `- Total Orders in Range: ${rangeCount}\n` +
          `- Total Revenue in Range: PKR ${rangeSum._sum.total ?? 0}\n` +
          (breakdown
            ? `- Daily Breakdown:\n${breakdown}`
            : `- No orders found in this date range.`);
      }

      const recentOrders = await prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { fullName: true, email: true } } },
      });

      dateContextStr +=
        `\n\nRecent Orders (latest 10):\n` +
        recentOrders
          .map(
            (o) =>
              `- Order #${o.id.substring(0, 8)} on ${o.createdAt.toISOString().split("T")[0]} | Status: ${o.status} | PKR ${o.total} | ${o.user?.email || "Unknown"}`,
          )
          .join("\n");

      contextParts.push(dateContextStr);
    }

    if (asksLowStock || isGeneral) {
      const lowStockProducts = await prisma.product.findMany({
        where: { deletedAt: null, variants: { some: { stock: { lte: 5 } } } },
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

    if (asksUnsold) {
      const unsoldProducts = await prisma.product.findMany({
        where: { deletedAt: null, orderItems: { none: {} } },
        select: {
          id: true,
          title: true,
          price: true,
          category: { select: { name: true } },
          variants: { select: { sku: true, stock: true } },
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

// ─── LLM Inference ───────────────────────────────────────────────────────────

export async function runAdminChatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages,
    temperature: CHATBOT_TEMPERATURE,
    top_p: CHATBOT_TOP_P,
    max_tokens: ADMIN_CHATBOT_MAX_TOKENS,
  });
  return (
    completion.choices[0]?.message?.content?.trim() ||
    "I was unable to retrieve a response."
  );
}

// ─── Session helpers ─────────────────────────────────────────────────────────

export class AdminChatbotService {
  static async resolveOrCreateSession(
    userId: string,
    message: string,
    sessionId?: string,
  ) {
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
    return { chatSession, isNewSession };
  }

  static async persistMessages(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
  ) {
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { sessionId, role: "user", content: userMessage },
      }),
      prisma.chatMessage.create({
        data: { sessionId, role: "assistant", content: assistantMessage },
      }),
    ]);
  }

  static async listSessions(userId: string) {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
    });
  }

  static async getSession(userId: string, sessionId: string) {
    return prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }
}
