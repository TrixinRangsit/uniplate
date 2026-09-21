import db from "@/lib/db";
import { getSession } from "@/lib/auth";

// Any page or component can call this to find out who's logged in.
// It never trusts anything from the browser except the httpOnly cookie —
// the cookie can't be read or edited by JS, so this is the one source
// of truth for "who is this, really".
export async function GET() {
  const session = await getSession();

  if (!session) {
    return Response.json({ success: false, user: null }, { status: 401 });
  }

  // Re-check the database on every call instead of trusting the token's
  // cached role. This matters here specifically: if an admin rejects a
  // shopowner mid-session, or changes someone's role, the change takes
  // effect on their very next request instead of waiting for the token
  // to expire up to 7 days later.
  const [users] = await db.query(
    `SELECT user_id, name, email, phone, role, approval_status
     FROM users WHERE user_id = ?`,
    [session.user_id]
  );

  if (users.length === 0 || users[0].approval_status !== "approved") {
    return Response.json({ success: false, user: null }, { status: 401 });
  }

  return Response.json({ success: true, user: users[0] });
}