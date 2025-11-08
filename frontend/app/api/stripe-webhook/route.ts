import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/app/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Disable body parsing for webhook route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Create the monetary donation in the database
    const supabase = await createClient();

    const { error } = await supabase.from("monetary_donations").insert({
      user_id: session.metadata?.userId,
      from_latitude: parseFloat(session.metadata?.fromLatitude || "0"),
      from_longitude: parseFloat(session.metadata?.fromLongitude || "0"),
      to_latitude: parseFloat(session.metadata?.toLatitude || "0"),
      to_longitude: parseFloat(session.metadata?.toLongitude || "0"),
      amount: parseFloat(session.metadata?.amount || "0"),
    });

    if (error) {
      console.error("Error creating monetary donation:", error);
      return NextResponse.json(
        { error: "Failed to create donation record" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}

