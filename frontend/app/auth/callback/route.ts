import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { ROUTES } from "@/app/lib/routes";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the user to check if they have a profile
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single();

        // If no profile exists and no explicit next parameter, redirect to account page
        if (!profile && !next) {
          return NextResponse.redirect(`${origin}${ROUTES.ACCOUNT}`);
        }
      }

      // Use the next parameter if provided, otherwise default to map
      return NextResponse.redirect(`${origin}${next || ROUTES.MAP}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}${ROUTES.SIGN_IN}?error=auth_callback_error`
  );
}
