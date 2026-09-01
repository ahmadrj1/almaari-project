import { NextResponse } from "next/server";
import { getServerSessionSnapshot } from "@/lib/auth-session";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await getServerSessionSnapshot();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerId = await getOrCreateStripeCustomer(session.user.id);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: "off_session",
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
