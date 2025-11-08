import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { giftCardType } = await request.json();

    if (!giftCardType) {
      return NextResponse.json(
        { error: "Gift card type is required" },
        { status: 400 }
      );
    }

    const validGiftCardTypes = [
      "starbucks",
      "wawa",
      "walmart",
      "target",
      "dunkin",
      "amazon",
    ];

    if (!validGiftCardTypes.includes(giftCardType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid gift card type" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has enough points
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("rewards, email")
      .eq("id", user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const currentRewards = profile.rewards || 0;
    if (currentRewards < 50) {
      return NextResponse.json(
        { error: "Insufficient rewards points. Need 50 points." },
        { status: 400 }
      );
    }

    // Subtract 50 points
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ rewards: currentRewards - 50 })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update rewards" },
        { status: 500 }
      );
    }

    // In a real implementation, you would send an email here
    // For now, we'll just return success
    // TODO: Send email confirmation with gift card details

    return NextResponse.json({
      success: true,
      message: "Gift card redeemed successfully",
      newRewardsBalance: currentRewards - 50,
    });
  } catch (error: any) {
    console.error("Error redeeming gift card:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

