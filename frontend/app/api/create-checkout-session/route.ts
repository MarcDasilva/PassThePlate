import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-10-29.clover",
});

export async function POST(request: NextRequest) {
  try {
    const {
      amount,
      userId,
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude,
    } = await request.json();

    if (
      !amount ||
      !userId ||
      !fromLatitude ||
      !fromLongitude ||
      !toLatitude ||
      !toLongitude
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (amount < 1 || amount > 10) {
      return NextResponse.json(
        { error: "Amount must be between $1 and $10" },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe secret key not configured" },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Monetary Donation",
              description:
                "Supporting community donations through PassThePlate",
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      }/donation/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin
      }/donation/cancel`,
      metadata: {
        userId,
        fromLatitude: fromLatitude.toString(),
        fromLongitude: fromLongitude.toString(),
        toLatitude: toLatitude.toString(),
        toLongitude: toLongitude.toString(),
        amount: amount.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
