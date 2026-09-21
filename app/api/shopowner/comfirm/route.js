import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request) {
  let connection;

  try {
    const session = await getSession();

    if (!session || session.role !== "shopowner") {
      return Response.json(
        {
          success: false,
          message: "Shop owner access required",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const orderId = Number(body.order_id);

    if (!orderId) {
      return Response.json(
        {
          success: false,
          message: "Order ID is required",
        },
        { status: 400 }
      );
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    /*
     * Verify that this order contains
     * items belonging to the logged-in shop owner.
     */
    const [orders] = await connection.query(
      `
      SELECT
        o.order_id,
        o.checkout_id,
        o.order_status,
        o.pickup_status
      FROM orders o

      WHERE o.order_id = ?

      AND EXISTS (
        SELECT 1
        FROM order_items oi
        INNER JOIN menu_items mi
          ON oi.menu_item_id = mi.menu_item_id
        WHERE oi.order_id = o.order_id
          AND mi.shop_owner_id = ?
      )

      LIMIT 1
      `,
      [
        orderId,
        session.user_id,
      ]
    );

    if (orders.length === 0) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message:
            "Order not found or this order does not belong to your shop",
        },
        { status: 404 }
      );
    }

    const order = orders[0];

    /*
     * Make sure the order has been confirmed
     * by admin payment approval.
     */
    if (order.order_status !== "confirmed") {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message:
            "This order is not ready for handover yet",
        },
        { status: 400 }
      );
    }

    /*
     * Prevent duplicate handover.
     */
    if (order.pickup_status === "collected") {
      await connection.rollback();

      return Response.json({
        success: true,
        message:
          "This order has already been handed over",
      });
    }

    /*
     * Mark this shop's order as collected.
     */
    await connection.query(
      `
      UPDATE orders
      SET
        order_status = 'collected',
        pickup_status = 'collected',
        pickup_time = NOW()
      WHERE order_id = ?
      `,
      [orderId]
    );

    /*
     * Check whether all shop orders
     * under this checkout are collected.
     */
    const [remaining] =
      await connection.query(
        `
        SELECT COUNT(*) AS remaining
        FROM orders
        WHERE checkout_id = ?
          AND pickup_status <> 'collected'
        `,
        [order.checkout_id]
      );

    if (
      remaining[0].remaining === 0
    ) {
      /*
       * All shops have handed over
       * their food.
       */
      await connection.query(
        `
        UPDATE checkout_sessions
        SET checkout_status = 'completed'
        WHERE checkout_id = ?
        `,
        [order.checkout_id]
      );

      /*
       * The QR is no longer needed.
       */
      await connection.query(
        `
        UPDATE qr_receipts
        SET
          status = 'used',
          used_at = NOW(),
          scanned_by = ?
        WHERE checkout_id = ?
        `,
        [
          session.user_id,
          order.checkout_id,
        ]
      );
    }

    await connection.commit();

    return Response.json({
      success: true,
      message:
        "Order handed over successfully",
      order_id: orderId,
      checkout_id:
        order.checkout_id,
      checkout_completed:
        remaining[0].remaining === 0,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      "SHOP OWNER CONFIRM ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to confirm order",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}