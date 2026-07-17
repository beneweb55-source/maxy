import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/constantes";

export function middleware(request: NextRequest) {
  const jeton = request.cookies.get(SESSION_COOKIE)?.value;
  const estConnexion = request.nextUrl.pathname === "/connexion";

  if (!jeton && !estConnexion) {
    const url = new URL("/connexion", request.url);
    const destination = request.nextUrl.pathname + request.nextUrl.search;
    if (destination !== "/") url.searchParams.set("suivant", destination);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
