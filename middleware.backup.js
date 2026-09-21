import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Add page paths here as you build them, e.g. /shopowner/dashboard
// These MUST match the enum on users.role exactly: student, shopowner, delivery, admin
const roleRoutes = {
  "/shopowner": ["shopowner"],
  "/delivery": ["delivery"],
  "/admin": ["admin"],
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(roleRoutes).find((p) =>
    pathname.startsWith(p)
  );
  if (!matchedPrefix) return NextResponse.next();

  const token = request.cookies.get("session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    if (!roleRoutes[matchedPrefix].includes(payload.role)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/shopowner/:path*", "/delivery/:path*", "/admin/:path*"],
};