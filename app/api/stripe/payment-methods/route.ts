import { NextResponse } from "next/server";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function GET() {
  try {
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id);
    const customer = await stripe.customers.retrieve(customerId);

    if (customer.deleted) {
      return NextResponse.json({
        paymentMethods: [],
        defaultPaymentMethodId: null,
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const defaultPaymentMethodId = customer.invoice_settings
      ?.default_payment_method as string | null;

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
      defaultPaymentMethodId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { paymentMethodId, setAsDefault } = body;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id);

    // Retrieve the incoming PM's fingerprint to check for duplicates
    const incomingPm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const incomingFingerprint = incomingPm.card?.fingerprint;

    const existingPms = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    if (existingPms.data.length >= 5) {
      return NextResponse.json({ error: "MAX_CARDS_REACHED" }, { status: 400 });
    }

    if (incomingFingerprint) {
      const isDuplicate = existingPms.data.some(
        (pm) => pm.card?.fingerprint === incomingFingerprint,
      );
      if (isDuplicate) {
        return NextResponse.json({ error: "DUPLICATE_CARD" }, { status: 409 });
      }
    }

    // Attach to customer
    const attachedPm = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    if (setAsDefault) {
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: attachedPm.id,
        brand: attachedPm.card?.brand,
        last4: attachedPm.card?.last4,
        expMonth: attachedPm.card?.exp_month,
        expYear: attachedPm.card?.exp_year,
      },
    });
  } catch (error: unknown) {
    const errObj = error as {
      message?: string;
      type?: string;
      raw?: { type?: string };
    };
    const isStripeError =
      errObj?.type?.startsWith("Stripe") || errObj?.raw?.type != null;
    const status = isStripeError ? 400 : 500;
    return NextResponse.json(
      { error: errObj.message || "Internal Server Error" },
      { status },
    );
  }
}
