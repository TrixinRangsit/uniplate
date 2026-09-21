import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function POST(request) {
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

    const qrToken = body.qr_token?.trim();

    if (!qrToken) {
      return Response.json(
        {
          success: false,
          message: "QR token is required",
        },
        { status: 400 }
      );
    }

    /*
     * Find the checkout using the QR token
     */
    const [qrRows] = await db.query(
      `
      SELECT
        qr.qr_id,
        qr.checkout_id,
        qr.status AS qr_status,

        cs.student_id,
        cs.fulfillment_type,
        cs.checkout_status,
        cs.building_number,
        cs.delivery_phone,
        cs.delivery_note,

        u.name AS student_name
      FROM qr_receipts qr

      INNER JOIN checkout_sessions cs
        ON qr.checkout_id = cs.checkout_id

      INNER JOIN users u
        ON cs.student_id = u.user_id

      WHERE qr.qr_token = ?
      LIMIT 1
      `,
      [qrToken]
    );

    if (qrRows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid QR code",
        },
        { status: 404 }
      );
    }

    const qr = qrRows[0];

    if (qr.qr_status !== "active") {
      return Response.json(
        {
          success: false,
          message: "This QR code is no longer active",
        },
        { status: 400 }
      );
    }

    if (
      qr.checkout_status !==
      "payment_approved"
    ) {
      return Response.json(
        {
          success: false,
          message:
            "This order has not been approved yet",
        },
        { status: 400 }
      );
    }

    /*
     * Find THIS shop owner's order
     */
    const [orders] = await db.query(
      `
      SELECT
        o.order_id,
        o.food_court_id,
        o.total_amount,
        o.order_status,
        o.pickup_status,

        fc.name AS shop_name
      FROM orders o

      LEFT JOIN food_courts fc
        ON o.food_court_id = fc.food_court_id

      WHERE o.checkout_id = ?

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
        qr.checkout_id,
        session.user_id,
      ]
    );

    if (orders.length === 0) {
      return Response.json(
        {
          success: false,
          message:
            "This QR code does not contain an order for your shop",
        },
        { status: 403 }
      );
    }

    const order = orders[0];

    /*
     * Get only this shop owner's items
     */
    const [items] = await db.query(
      `
      SELECT
        oi.order_item_id,
        oi.quantity,
        oi.price,
        oi.customization,

        mi.menu_item_id,
        mi.name AS item_name,
        mi.image

      FROM order_items oi

      INNER JOIN menu_items mi
        ON oi.menu_item_id = mi.menu_item_id

      WHERE oi.order_id = ?
        AND mi.shop_owner_id = ?

      ORDER BY oi.order_item_id ASC
      `,
      [
        order.order_id,
        session.user_id,
      ]
    );

    return Response.json({
      success: true,

      checkout: {
        checkout_id: qr.checkout_id,
        fulfillment_type:
          qr.fulfillment_type,
        student_name:
          qr.student_name,
        building_number:
          qr.building_number,
        delivery_phone:
          qr.delivery_phone,
        delivery_note:
          qr.delivery_note,
      },

      shop: {
        shop_name:
          order.shop_name,
      },

      order: {
        order_id:
          order.order_id,
        total_amount:
          order.total_amount,
        order_status:
          order.order_status,
        pickup_status:
          order.pickup_status,
        items,
      },
    });
  } catch (error) {
    console.error(
      "SHOP OWNER QR SCAN ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to scan QR code",
      },
      { status: 500 }
    );
  }
}