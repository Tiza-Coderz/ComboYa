import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Solo corre en /admin: refresca la sesión de Supabase (cookies) y manda al
 * login a quien no la tenga. La comprobación de que el usuario es
 * administrador se hace en el layout del panel (requireAdmin) y en la BD (RLS).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const enLogin = request.nextUrl.pathname === "/admin/login";
  if (!user && !enLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
