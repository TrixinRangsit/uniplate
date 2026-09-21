import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request) {
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

    if (session.role !== "shopowner") {
      return Response.json(
        {
          success: false,
          message: "Shop owner access only.",
        },
        { status: 403 }
      );
    }

    const shopOwnerId = Number(session.user_id);

    const body = await request.json();

    const orderId = Number(body.order_id);
    const newStatus = body.status;

    if (!orderId || !newStatus) {
      return Response.json(
        {
          success: false,
          message: "Order ID and status are required.",
        },
        { status: 400 }
      );
    }

    const allowedStatuses = [
      "confirmed",
      "preparing",
      "ready",
    ];

    if (!allowedStatuses.includes(newStatus)) {
      return Response.json(
        {
          success: false,
          message: "Invalid order status.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FIND ORDER
    // Only allow this shop owner to update their own order
    // =====================================================

    const [orders] = await db.query(
      `
      SELECT
        o.order_id,
        o.checkout_id,
        o.order_status,
        o.fulfillment_type
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
      [orderId, shopOwnerId]
    );

    if (orders.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Order not found or you do not own this order.",
        },
        { status: 404 }
      );
    }

    const order = orders[0];

    // =====================================================
    // CHECK PAYMENT
    // Shop can only process paid orders
    // =====================================================

    const [payments] = await db.query(
      `
      SELECT payment_status
      FROM checkout_payments
      WHERE checkout_id = ?
      ORDER BY payment_id DESC
      LIMIT 1
      `,
      [order.checkout_id]
    );

    if (
      payments.length === 0 ||
      payments[0].payment_status !== "approved"
    ) {
      return Response.json(
        {
          success: false,
          message: "Payment has not been approved yet.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALID STATUS TRANSITIONS
    // =====================================================

    const currentStatus = order.order_status;

    const validTransitions = {
      pending: ["confirmed"],
      confirmed: ["preparing"],
      preparing: ["ready"],
    };

    if (
      !validTransitions[currentStatus] ||
      !validTransitions[currentStatus].includes(newStatus)
    ) {
      return Response.json(
        {
          success: false,
          message:
            `Cannot change order from "${currentStatus}" to "${newStatus}".`,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // UPDATE THIS SHOP'S ORDER
    // =====================================================

    await db.query(
      `
      UPDATE orders
      SET order_status = ?
      WHERE order_id = ?
      `,
      [newStatus, orderId]
    );

    // =====================================================
    // DELIVERY LOGIC
    // Only activate delivery when ALL orders in the
    // checkout are ready.
    // =====================================================

    if (
      newStatus === "ready" &&
      order.fulfillment_type === "delivery"
    ) {
      const [checkoutOrders] = await db.query(
        `
        SELECT
          order_id,
          order_status
        FROM orders
        WHERE checkout_id = ?
        `,
        [order.checkout_id]
      );

      const allOrdersReady =
        checkoutOrders.length > 0 &&
        checkoutOrders.every(
          (item) => item.order_status === "ready"
        );

      if (allOrdersReady) {
        // -----------------------------------------------
        // Create delivery record if it does not exist
        // -----------------------------------------------

        const [deliveryRows] = await db.query(
          `
          SELECT
            delivery_id,
            delivery_status
          FROM delivery_records
          WHERE checkout_id = ?
          LIMIT 1
          `,
          [order.checkout_id]
        );

        if (deliveryRows.length === 0) {
          await db.query(
            `
            INSERT INTO delivery_records
              (
                checkout_id,
                delivery_status
              )
            VALUES
              (?, 'ready_for_delivery')
            `,
            [order.checkout_id]
          );
        } else {
          await db.query(
            `
            UPDATE delivery_records
            SET delivery_status = 'ready_for_delivery'
            WHERE delivery_id = ?
            `,
            [deliveryRows[0].delivery_id]
          );
        }

        // -----------------------------------------------
        // Update checkout
        // -----------------------------------------------

        await db.query(
          `
          UPDATE checkout_sessions
          SET checkout_status = 'ready_for_delivery'
          WHERE checkout_id = ?
          `,
          [order.checkout_id]
        );
      }
    }

    // =====================================================
    // PICKUP
    // The shop order itself being "ready" is enough.
    // Student will see Ready for Pickup.
    // =====================================================

    return Response.json({
      success: true,

      message:
        newStatus === "preparing"
          ? "Order is now being prepared."
          : newStatus === "ready"
          ? "Order is ready."
          : "Order confirmed.",

      order: {
        order_id: order.order_id,
        checkout_id: order.checkout_id,
        order_status: newStatus,
      },
    });
  } catch (error) {
    console.error(
      "SHOP OWNER ORDER STATUS ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message: "Unable to update order status.",
      },
      { status: 500 }
    );
  }
}