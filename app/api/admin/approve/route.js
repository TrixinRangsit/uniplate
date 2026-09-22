import db from "@/lib/db";

export async function PUT(request) {
  let connection;

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

    const [users] = await db.query(
      `
      SELECT
        user_id,
        name,
        role,
        approval_status,
        food_court_id
      FROM users
      WHERE user_id = ?
      LIMIT 1
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

    // Only Shop Owner and Delivery accounts can be approved
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

    // ==========================================
    // REJECT
    // ==========================================

    if (action === "reject") {
      await db.query(
        `
        UPDATE users
        SET approval_status = 'rejected'
        WHERE user_id = ?
        `,
        [user_id]
      );

      return Response.json({
        success: true,
        message: "Account rejected",
      });
    }

    // ==========================================
    // APPROVE DELIVERY
    // ==========================================

    if (user.role === "delivery") {
      await db.query(
        `
        UPDATE users
        SET approval_status = 'approved'
        WHERE user_id = ?
        `,
        [user_id]
      );

      return Response.json({
        success: true,
        message: "Delivery account approved",
      });
    }

    // ==========================================
    // APPROVE SHOP OWNER
    // ==========================================

    if (user.role === "shopowner") {
      connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // If already assigned, don't create another Food Court
        if (user.food_court_id) {
          await connection.query(
            `
            UPDATE users
            SET approval_status = 'approved'
            WHERE user_id = ?
            `,
            [user_id]
          );

          await connection.commit();

          return Response.json({
            success: true,
            message: "Shop Owner approved successfully.",
          });
        }

        // ------------------------------------------
        // Create Food Court name
        // Example:
        // Drink -> Drink Food Court
        // Japanese -> Japanese Food Court
        // ------------------------------------------

        const baseFoodCourtName = `${user.name} Food Court`;

        // Check if this Food Court name already exists
        const [existingCourts] = await connection.query(
          `
          SELECT food_court_id
          FROM food_courts
          WHERE name = ?
          LIMIT 1
          `,
          [baseFoodCourtName]
        );

        let foodCourtName = baseFoodCourtName;

        // If the same name already exists,
        // create a unique name
        if (existingCourts.length > 0) {
          let counter = 2;

          while (true) {
            const newName = `${user.name} Food Court ${counter}`;

            const [duplicate] = await connection.query(
              `
              SELECT food_court_id
              FROM food_courts
              WHERE name = ?
              LIMIT 1
              `,
              [newName]
            );

            if (duplicate.length === 0) {
              foodCourtName = newName;
              break;
            }

            counter++;
          }
        }

        // ------------------------------------------
        // Create new Food Court
        // ------------------------------------------

        const [foodCourtResult] = await connection.query(
          `
          INSERT INTO food_courts
          (
            name,
            location,
            status
          )
          VALUES (?, ?, 'active')
          `,
          [
            foodCourtName,
            "University Campus",
          ]
        );

        const newFoodCourtId =
          foodCourtResult.insertId;

        // ------------------------------------------
        // Assign Food Court to Shop Owner
        // ------------------------------------------

        await connection.query(
          `
          UPDATE users
          SET
            approval_status = 'approved',
            food_court_id = ?
          WHERE user_id = ?
          `,
          [
            newFoodCourtId,
            user_id,
          ]
        );

        await connection.commit();

        return Response.json({
          success: true,
          message: `Shop Owner approved and ${foodCourtName} was created.`,
          food_court: {
            food_court_id: newFoodCourtId,
            name: foodCourtName,
            location: "University Campus",
          },
        });
      } catch (transactionError) {
        if (connection) {
          await connection.rollback();
        }

        throw transactionError;
      } finally {
        if (connection) {
          connection.release();
          connection = null;
        }
      }
    }

    return Response.json(
      {
        success: false,
        message: "Unsupported account type",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Approval error:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to update account",
      },
      { status: 500 }
    );
  }
}