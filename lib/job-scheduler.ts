const JOB_SCHEDULER_URL =
  process.env.JOB_SCHEDULER_URL || "http://localhost:8000";

const JOB_SCHEDULER_SECRET = process.env.JOB_SCHEDULER_SECRET || "";

function schedulerHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Scheduler-Secret": JOB_SCHEDULER_SECRET,
  };
}

export async function queueForgotPasswordEmail(
  userEmail: string,
  resetToken: string,
) {
  try {
    const res = await fetch(
      `${JOB_SCHEDULER_URL}/api/v1/jobs/forgot-password`,
      {
        method: "POST",
        headers: schedulerHeaders(),
        body: JSON.stringify({
          user_email: userEmail,
          reset_token: resetToken,
        }),
      },
    );
    return await res.json();
  } catch (error) {
    console.error("[JOB SCHEDULER ERROR] queueForgotPasswordEmail:", error);
    return null;
  }
}

export async function queueOrderStatusEmail(orderId: string) {
  try {
    const res = await fetch(
      `${JOB_SCHEDULER_URL}/api/v1/jobs/order-status-email`,
      {
        method: "POST",
        headers: schedulerHeaders(),
        body: JSON.stringify({ order_id: orderId }),
      },
    );
    return await res.json();
  } catch (error) {
    console.error("[JOB SCHEDULER ERROR] queueOrderStatusEmail:", error);
    return null;
  }
}

export async function queueBulkProductsUpload(
  products: Array<{
    title: string;
    description: string;
    price: number;
    image: string;
    categoryName?: string;
    sku?: string;
    targetProductId?: string;
    variants?: Array<{
      colorName: string;
      hexCode?: string;
      sizeName: string;
      stock: number;
      sku?: string;
    }>;
    images?: Array<{ url: string; colorName?: string; sortOrder?: number }>;
  }>,
  method: "POST" | "PATCH" = "POST",
) {
  try {
    const res = await fetch(
      `${JOB_SCHEDULER_URL}/api/v1/jobs/bulk-products-upload`,
      {
        method,
        headers: schedulerHeaders(),
        body: JSON.stringify({ products }),
      },
    );
    return await res.json();
  } catch (error) {
    console.error(
      `[JOB SCHEDULER ERROR] queueBulkProductsUpload (${method}):`,
      error,
    );
    return null;
  }
}
