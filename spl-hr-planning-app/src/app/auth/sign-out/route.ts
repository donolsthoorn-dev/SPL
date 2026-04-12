import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next") ?? "/login";
  const redirectUrl = new URL(nextPath, request.url);

  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          response = NextResponse.redirect(redirectUrl);
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();
  return response;
}
