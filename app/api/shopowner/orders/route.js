import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    // ==========================================
    // CHECK LOGIN
    // ==========================================

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

    // ==========================================
    // SHOP OWNER ONLY
    // ==========================================

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

    // ==========================================
    // GET ORDERS BELONGING TO THIS SHOP OWNER
    // ==========================================

    const [orders] = await db.query(
      `
      SELECT
        o.order_id,
        o.checkout_id,
        o.student_id,
        o.food_court_id,
        o.total_amount,
        o.delivery_fee,
        o.fulfillment_type,
        o.building_number,
        o.delivery_phone,
        o.delivery_note,
        o.order_status,
        o.pickup_status,
        o.pickup_time,
        o.created_at,

        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,

        fc.name AS shop_name,

        cs.checkout_status,

        cp.payment_status,
        cp.payment_proof,
        cp.approved_at,

        dr.delivery_id,
        dr.delivery_status,
        dr.delivery_person_id

      FROM orders o

      INNER JOIN users u
        ON o.student_id = u.user_id

      LEFT JOIN food_courts fc
        ON o.food_court_id = fc.food_court_id

      INNER JOIN checkout_sessions cs
        ON o.checkout_id = cs.checkout_id

      LEFT JOIN checkout_payments cp
        ON o.checkout_id = cp.checkout_id

      LEFT JOIN delivery_records dr
        ON o.checkout_id = dr.checkout_id

      WHERE EXISTS (
        SELECT 1
        FROM order_items oi
        INNER JOIN menu_items mi
          ON oi.menu_item_id = mi.menu_item_id
        WHERE oi.order_id = o.order_id
          AND mi.shop_owner_id = ?
      )

      ORDER BY o.created_at DESC
      `,
      [shopOwnerId]
    );

    // ==========================================
    // GET ITEMS FOR EACH ORDER
    // ==========================================

    for (const order of orders) {
      const [items] = await db.query(
        `
        SELECT
          oi.order_item_id,
          oi.menu_item_id,
          oi.quantity,
          oi.price,
          oi.customization,
          oi.subtotal,

          mi.name AS menu_name,
          mi.image AS menu_image

        FROM order_items oi

        INNER JOIN menu_items mi
          ON oi.menu_item_id = mi.menu_item_id

        WHERE oi.order_id = ?

        ORDER BY oi.order_item_id ASC
        `,
        [order.order_id]
      );

      order.items = items;
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return Response.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "SHOP OWNER ORDERS ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to load shop owner orders.",
      },
      { status: 500 }
    );
  }
}