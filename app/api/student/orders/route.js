import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    // ==========================================
    // CHECK LOGIN
    // ==========================================

    const session = await getSession();

    if (!session) {
      return Response.json(
        {
          success: false,
          message: "Please login first.",
        },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student access only.",
        },
        { status: 403 }
      );
    }

    const studentId = Number(session.user_id);

    if (!studentId) {
      return Response.json(
        {
          success: false,
          message: "Invalid student session.",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // GET STUDENT ORDERS
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

        fc.name AS shop_name,

        cs.checkout_status,
        cs.subtotal AS checkout_subtotal,
        cs.delivery_fee AS checkout_delivery_fee,
        cs.total_amount AS checkout_total,

        cp.payment_status,
        cp.payment_proof,

        dr.delivery_id,
        dr.delivery_status,
        dr.delivery_photo,
        dr.delivered_at

      FROM orders o

      INNER JOIN checkout_sessions cs
        ON o.checkout_id = cs.checkout_id

      LEFT JOIN food_courts fc
        ON o.food_court_id = fc.food_court_id

      LEFT JOIN checkout_payments cp
        ON o.checkout_id = cp.checkout_id

      LEFT JOIN delivery_records dr
        ON o.checkout_id = dr.checkout_id

      WHERE o.student_id = ?

      ORDER BY o.created_at DESC
      `,
      [studentId]
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
    // RETURN ORDERS
    // ==========================================

    return Response.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "STUDENT ORDERS GET ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to load student orders.",
      },
      { status: 500 }
    );
  }
}