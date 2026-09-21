import db from "@/lib/db";

export async function PUT(request) {
  try {
    const { user_id, action } = await request.json();

    if (!user_id || !action) {
      return Response.json(
        {
          success: false,
          message: "User ID and action are required",
        },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return Response.json(
        {
          success: false,
          message: "Invalid action",
        },
        { status: 400 }
      );
    }

    // Make sure only Shop Owner and Delivery accounts
    // can be approved/rejected here.
    const [users] = await db.query(
      `
      SELECT user_id, role
      FROM users
      WHERE user_id = ?
      `,
      [user_id]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    if (!["shopowner", "delivery"].includes(users[0].role)) {
      return Response.json(
        {
          success: false,
          message: "Only Shop Owner and Delivery accounts can be approved",
        },
        { status: 403 }
      );
    }

    const newStatus =
      action === "approve" ? "approved" : "rejected";

    await db.query(
      `
      UPDATE users
      SET approval_status = ?
      WHERE user_id = ?
      `,
      [newStatus, user_id]
    );

    return Response.json({
      success: true,
      message: `Account ${newStatus}`,
    });

  } catch (error) {
    console.error("Approval error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to update account",
      },
      { status: 500 }
    );
  }
}