import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// .env.local: add JWT_SECRET=<any long random string>
// Generate one with: openssl rand -base64 32
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Call this right after a successful login/register.
// payload should be small — just what routes need to check permissions.
// e.g. createSession({ user_id: user.user_id, role: user.role })
export async function createSession(payload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true, // JS in the browser can't read this — blocks XSS token theft
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// Call this at the top of any protected API route or Server Component.
// Returns null if there's no session or it's invalid/expired.
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload; // { user_id, role, iat, exp }
  } catch {
    return null; // expired or tampered
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}