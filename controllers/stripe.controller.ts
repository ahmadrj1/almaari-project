import { NextResponse } from "next/server";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { StripeService } from "@/services/stripe.service";

export class StripeController {
  static async getPaymentMethods(_req: Request) {
    try {
      const session = await getServerSessionSnapshot();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const data = await StripeService.getPaymentMethods(session.user.id);
      return NextResponse.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  static async addPaymentMethod(req: Request) {
    try {
      const session = await getServerSessionSnapshot();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      const { paymentMethodId, setAsDefault } = body;

      const paymentMethod = await StripeService.addPaymentMethod(
        session.user.id,
        { paymentMethodId, setAsDefault },
      );

      return NextResponse.json({
        success: true,
        paymentMethod,
      });
    } catch (error: unknown) {
      const errObj = error as {
        message?: string;
        statusCode?: number;
        type?: string;
        raw?: { type?: string };
      };

      if (errObj.statusCode) {
        return NextResponse.json(
          { error: errObj.message },
          { status: errObj.statusCode },
        );
      }

      const isStripeError =
        errObj?.type?.startsWith("Stripe") || errObj?.raw?.type != null;
      const status = isStripeError ? 400 : 500;
      return NextResponse.json(
        { error: errObj.message || "Internal Server Error" },
        { status },
      );
    }
  }

  static async deletePaymentMethod(_req: Request, id: string) {
    try {
      const session = await getServerSessionSnapshot();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const data = await StripeService.deletePaymentMethod(session.user.id, id);
      return NextResponse.json(data);
    } catch (error: unknown) {
      const errObj = error as { message?: string; statusCode?: number };
      if (errObj.statusCode) {
        return NextResponse.json(
          { error: errObj.message },
          { status: errObj.statusCode },
        );
      }
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  static async setDefaultPaymentMethod(req: Request, id: string) {
    try {
      const session = await getServerSessionSnapshot();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await req.json();
      if (!body.setAsDefault) {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
      }

      const data = await StripeService.setDefaultPaymentMethod(
        session.user.id,
        id,
      );
      return NextResponse.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  static async createSetupIntent(_req: Request) {
    try {
      const session = await getServerSessionSnapshot();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const data = await StripeService.createSetupIntent(session.user.id);
      return NextResponse.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  static async handleWebhook(req: Request) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let body: string;
    try {
      body = await req.text();
    } catch {
      return NextResponse.json(
        { error: "Failed to read body" },
        { status: 400 },
      );
    }

    try {
      const data = await StripeService.handleWebhook(body, sig);
      return NextResponse.json(data);
    } catch (error: unknown) {
      const errObj = error as { message?: string; statusCode?: number };
      if (errObj.statusCode) {
        return NextResponse.json(
          { error: errObj.message },
          { status: errObj.statusCode },
        );
      }
      return NextResponse.json({ error: "Handler failed" }, { status: 500 });
    }
  }
}
