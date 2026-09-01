import { NextResponse } from "next/server";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id);

    // Retrieve PM details first to see if it belongs to customer
    const pm = await stripe.paymentMethods.retrieve(id);
    if (pm.customer !== customerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await stripe.customers.retrieve(customerId);

    if (!customer.deleted) {
      if (customer.invoice_settings?.default_payment_method === id) {
        return NextResponse.json(
          { error: "Cannot delete the default payment method" },
          { status: 400 },
        );
      }
    }

    await stripe.paymentMethods.detach(id);

    // If it was default, check customer invoice_settings to clean it up or set another
    const customerUpdated = await stripe.customers.retrieve(customerId);
    if (
      !customerUpdated.deleted &&
      customerUpdated.invoice_settings?.default_payment_method === id
    ) {
      const remainingPms = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });
      const newDefault = remainingPms.data[0]?.id || undefined;
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: newDefault },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (!body.setAsDefault) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id);
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
