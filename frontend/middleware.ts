import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If explicitly logging out via query parameter, clear cookie and redirect to login
  const logoutParam = request.nextUrl.searchParams.get("logout");
  if (logoutParam === "true") {
    let currentLocale = pathname.match(/^\/(km|en)/)?.[1];
    if (!currentLocale) currentLocale = routing.defaultLocale;

    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}/login`;
    url.searchParams.delete("logout");
    
    const response = NextResponse.redirect(url);
    
    // Clear cookie on the host domain
    response.cookies.set("auth_token", "", {
      path: "/",
      maxAge: 0,
    });

    // Clear cookie on the root domain
    const host = request.headers.get("host")?.split(":")[0] || "";
    const domainParts = host.split(".");
    if (domainParts.length >= 2) {
      const cookieDomain = domainParts.slice(-2).join(".");
      response.cookies.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        domain: cookieDomain,
      });
      response.cookies.set("auth_token", "", {
        path: "/",
        maxAge: 0,
        domain: `.${cookieDomain}`,
      });
    }

    return response;
  }

  const token = request.cookies.get("auth_token")?.value;

  // Check if pathname already has a double locale prefix
  const hasDoubleLocale = /^\/(km|en)\/(km|en)\//.test(pathname);
  if (hasDoubleLocale) {
    // Remove the duplicate locale prefix
    const newPath = pathname.replace(/^\/(km|en)/, "");
    const url = request.nextUrl.clone();
    url.pathname = newPath;
    return NextResponse.redirect(url);
  }

  // Strip locale prefix to get the "real" path
  const pathnameWithoutLocale = pathname.replace(/^\/(km|en)/, "") || "/";

  const protectedRoutes = ["/dashboard"];
  const isProtected = protectedRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // Extract current locale from pathname or use default
  let currentLocale = pathname.match(/^\/(km|en)/)?.[1];
  if (!currentLocale) currentLocale = routing.defaultLocale;

  // No token and trying to access protected route -> redirect to login
  if (isProtected && !token) {
    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}/login`;
    return NextResponse.redirect(url);
  }

  // Already logged in and trying to access login -> redirect to dashboard
  if (token && pathnameWithoutLocale === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = `/${currentLocale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Let next-intl handle locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
