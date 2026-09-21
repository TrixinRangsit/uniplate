import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request) {
  let connection;

  try {
    const session = await getSession();

    if (!session || session.role !== "delivery") {
      return Response.json(
        {
          success: false,
          message: "Delivery person access required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const deliveryId = Number(body.delivery_id);

    if (!deliveryId) {
      return Response.json(
        {
          success: false,
          message: "Invalid delivery ID.",
        },
        { status: 400 }
      );
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Lock delivery record
    const [rows] = await connection.query(
      `
      SELECT
        delivery_id,
        checkout_id,
        delivery_person_id,
        delivery_status
      FROM delivery_records
      WHERE delivery_id = ?
      FOR UPDATE
      `,
      [deliveryId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message: "Delivery not found.",
        },
        { status: 404 }
      );
    }

    const delivery = rows[0];

    // Make sure this delivery belongs to this delivery person
    if (
      Number(delivery.delivery_person_id) !==
      Number(session.user_id)
    ) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message: "This delivery is not assigned to you.",
        },
        { status: 403 }
      );
    }

    // Food must currently be in collecting state
    if (delivery.delivery_status !== "collecting") {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message:
            "This delivery is not currently waiting for food collection.",
        },
        { status: 400 }
      );
    }

    // Mark food as collected
    await connection.query(
      `
      UPDATE delivery_records
      SET delivery_status = 'ready_for_delivery'
      WHERE delivery_id = ?
      `,
      [deliveryId]
    );

    // Update checkout
    await connection.query(
      `
      UPDATE checkout_sessions
      SET checkout_status = 'ready_for_delivery'
      WHERE checkout_id = ?
      `,
      [delivery.checkout_id]
    );

    await connection.commit();

    return Response.json({
      success: true,
      message: "Food collected successfully.",
      delivery_id: deliveryId,
      checkout_id: delivery.checkout_id,
      delivery_status: "ready_for_delivery",
      checkout_status: "ready_for_delivery",
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error("COLLECT DELIVERY ERROR:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message || "Unable to confirm food collection.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}