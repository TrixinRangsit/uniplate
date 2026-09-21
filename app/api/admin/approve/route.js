import db from "@/lib/db";

export async function PUT(request) {
  try {
    const {
      user_id,
      action,
      food_court_id,
    } = await request.json();

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

    // Find user
    const [users] = await db.query(
      `
      SELECT
        user_id,
        role,
        approval_status,
        food_court_id
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

    const user = users[0];

    // Only Shop Owner and Delivery accounts
    // can be approved/rejected here.
    if (!["shopowner", "delivery"].includes(user.role)) {
      return Response.json(
        {
          success: false,
          message:
            "Only Shop Owner and Delivery accounts can be approved",
        },
        { status: 403 }
      );
    }

    /*
      ==========================================
      REJECT ACCOUNT
      ==========================================
    */

    if (action === "reject") {
      await db.query(
        `
        UPDATE users
        SET
          approval_status = 'rejected'
        WHERE user_id = ?
        `,
        [user_id]
      );

      return Response.json({
        success: true,
        message: "Account rejected",
      });
    }

    /*
      ==========================================
      APPROVE ACCOUNT
      ==========================================
    */

    /*
      Shop Owners MUST have a Food Court.
      Delivery accounts do not need one.
    */

    if (user.role === "shopowner") {
      if (!food_court_id) {
        return Response.json(
          {
            success: false,
            message:
              "Please select a Food Court for this Shop Owner.",
          },
          { status: 400 }
        );
      }

      // Make sure the selected Food Court exists
      // and is active.
      const [foodCourts] = await db.query(
        `
        SELECT
          food_court_id,
          name,
          status
        FROM food_courts
        WHERE food_court_id = ?
          AND status = 'active'
        LIMIT 1
        `,
        [food_court_id]
      );

      if (foodCourts.length === 0) {
        return Response.json(
          {
            success: false,
            message:
              "Selected Food Court was not found or is inactive.",
          },
          { status: 400 }
        );
      }

      // Approve Shop Owner + assign Food Court
      await db.query(
        `
        UPDATE users
        SET
          approval_status = 'approved',
          food_court_id = ?
        WHERE user_id = ?
        `,
        [food_court_id, user_id]
      );

      return Response.json({
        success: true,
        message: `Shop Owner approved and assigned to ${foodCourts[0].name}.`,
      });
    }

    /*
      ==========================================
      APPROVE DELIVERY ACCOUNT
      ==========================================
    */

    await db.query(
      `
      UPDATE users
      SET
        approval_status = 'approved'
      WHERE user_id = ?
      `,
      [user_id]
    );

    return Response.json({
      success: true,
      message: "Delivery account approved",
    });
  } catch (error) {
    console.error("Approval error:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message || "Failed to update account",
      },
      { status: 500 }
    );
  }
}