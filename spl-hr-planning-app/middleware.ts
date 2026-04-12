import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Voorkom 500's op alle routes als env ontbreekt of Supabase tijdelijk faalt.
  let user: { id: string } | null = null;
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      });
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch {
      user = null;
    }
  }

  const { pathname } = request.nextUrl;

  const isLogin = pathname === "/login";

  const needsSessionPage =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/planning") ||
    pathname.startsWith("/prototype");

  if (!user && needsSessionPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/planning";
    return NextResponse.redirect(url);
  }

  return response;
}

/**
 * Één brede matcher (Supabase/Next aanbevolen), anders worden sommige paden
 * (zoals /prototype/index.html of /) soms niet door middleware gehaald.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
