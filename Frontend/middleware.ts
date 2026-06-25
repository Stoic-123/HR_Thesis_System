import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const { pathname } = request.nextUrl;

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
