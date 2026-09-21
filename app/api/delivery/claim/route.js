import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request) {
  let connection;

  try {
    const session = await getSession();

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "Please log in first.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "delivery") {
      return Response.json(
        {
          success: false,
          message: "Delivery access only.",
        },
        { status: 403 }
      );
    }

    const deliveryPersonId = Number(session.user_id);

    const body = await request.json();

    const deliveryId = Number(body.delivery_id);

    if (!deliveryId) {
      return Response.json(
        {
          success: false,
          message: "Delivery ID is required.",
        },
        { status: 400 }
      );
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    /*
     * =========================================================
     * LOCK DELIVERY RECORD
     * =========================================================
     */

    const [rows] = await connection.query(
      `
      SELECT
        delivery_id,
        checkout_id,
        delivery_person_id,
        delivery_status

      FROM delivery_records

      WHERE delivery_id = ?

      LIMIT 1

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

    /*
     * =========================================================
     * CHECK IF ALREADY CLAIMED
     * =========================================================
     */

    if (
      delivery.delivery_person_id &&
      Number(delivery.delivery_person_id) !==
        deliveryPersonId
    ) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message:
            "This delivery has already been claimed by another delivery person.",
        },
        { status: 409 }
      );
    }

    /*
     * =========================================================
     * ONLY THESE STATUSES CAN BE CLAIMED
     *
     * waiting
     * ready_for_delivery
     * =========================================================
     */

    if (
      delivery.delivery_status !== "waiting" &&
      delivery.delivery_status !==
        "ready_for_delivery"
    ) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message:
            "This delivery is no longer available to claim.",
        },
        { status: 409 }
      );
    }

    /*
     * =========================================================
     * CLAIM DELIVERY
     * =========================================================
     *
     * After claiming:
     *
     * waiting
     *       ↓
     * collecting
     *
     * ready_for_delivery
     *       ↓
     * collecting
     *
     */

    await connection.query(
      `
      UPDATE delivery_records

      SET
        delivery_person_id = ?,
        delivery_status = 'collecting'

      WHERE delivery_id = ?
      `,
      [deliveryPersonId, deliveryId]
    );

    /*
     * =========================================================
     * UPDATE CHECKOUT
     * =========================================================
     */

    await connection.query(
      `
      UPDATE checkout_sessions

      SET checkout_status = 'out_for_delivery'

      WHERE checkout_id = ?
        AND checkout_status IN (
          'ready_for_delivery',
          'payment_approved'
        )
      `,
      [delivery.checkout_id]
    );

    /*
     * =========================================================
     * COMMIT
     * =========================================================
     */

    await connection.commit();

    return Response.json({
      success: true,
      message: "Delivery claimed successfully.",
      delivery: {
        delivery_id: deliveryId,
        checkout_id: delivery.checkout_id,
        delivery_person_id:
          deliveryPersonId,
        delivery_status: "collecting",
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      "DELIVERY CLAIM ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to claim delivery.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}