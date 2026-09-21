import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    console.log("ME SESSION:", session);

    if (!session) {
      console.log("ME ERROR: No valid session");

      return Response.json(
        {
          success: false,
          user: null,
          reason: "NO_SESSION",
        },
        { status: 401 }
      );
    }

    const [users] = await db.query(
      `
      SELECT
        user_id,
        name,
        email,
        phone,
        role,
        approval_status
      FROM users
      WHERE user_id = ?
      `,
      [session.user_id]
    );

    console.log("ME USER:", users[0]);

    if (users.length === 0) {
      console.log(
        "ME ERROR: User does not exist:",
        session.user_id
      );

      return Response.json(
        {
          success: false,
          user: null,
          reason: "USER_NOT_FOUND",
        },
        { status: 401 }
      );
    }

    if (users[0].approval_status !== "approved") {
      console.log(
        "ME ERROR: User is not approved:",
        users[0].approval_status
      );

      return Response.json(
        {
          success: false,
          user: null,
          reason: "NOT_APPROVED",
          approval_status:
            users[0].approval_status,
        },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("ME API ERROR:", error);

    return Response.json(
      {
        success: false,
        user: null,
        reason: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}