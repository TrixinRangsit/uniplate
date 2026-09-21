import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== "delivery") {
      return Response.json(
        {
          success: false,
          message: "Delivery person access required",
        },
        { status: 403 }
      );
    }

    const deliveryPersonId = Number(session.user_id);

    // =====================================================
    // LOAD AVAILABLE / ASSIGNED DELIVERIES
    // =====================================================

    const [deliveries] = await db.query(
      `
      SELECT
        dr.delivery_id,
        dr.checkout_id,
        dr.delivery_person_id,
        dr.delivery_status,
        dr.delivery_photo,
        dr.delivered_at,

        cs.student_id,
        cs.fulfillment_type,
        cs.building_number,
        cs.delivery_phone,
        cs.delivery_note,
        cs.subtotal,
        cs.delivery_fee,
        cs.total_amount,
        cs.checkout_status,

        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone,

        qr.qr_token,
        qr.status AS qr_status

      FROM delivery_records dr

      INNER JOIN checkout_sessions cs
        ON dr.checkout_id = cs.checkout_id

      INNER JOIN users u
        ON cs.student_id = u.user_id

      LEFT JOIN qr_receipts qr
        ON qr.checkout_id = cs.checkout_id
        AND qr.status = 'active'

      WHERE
        dr.delivery_status IN (
          'waiting',
          'collecting',
          'ready_for_delivery',
          'out_for_delivery'
        )

        AND (
          dr.delivery_person_id IS NULL
          OR dr.delivery_person_id = ?
        )

      ORDER BY dr.created_at DESC
      `,
      [deliveryPersonId]
    );

    // =====================================================
    // LOAD ALL SHOPS FOR EACH CHECKOUT
    // =====================================================

    for (const delivery of deliveries) {
      /*
        IMPORTANT:

        DO NOT use orders.food_court_id here.

        The real food court must come from:

        order_items
              ↓
        menu_items
              ↓
        food_court_id
              ↓
        food_courts

        This guarantees:

        Chicken Yakisoba
          -> Japanese Food Court

        Pad See Ew Chicken
          -> Thai Food Court

        Shan Noodle
          -> Burmese Food Court
      */

      const [rows] = await db.query(
        `
        SELECT
          o.order_id,
          o.checkout_id,
          o.order_status,
          o.pickup_status,
          o.pickup_time,
          o.total_amount,

          mi.menu_item_id,
          mi.name AS menu_name,
          mi.image AS menu_image,

          oi.order_item_id,
          oi.quantity,
          oi.price,
          oi.subtotal,

          fc.food_court_id,
          fc.name AS shop_name,
          fc.location AS shop_location

        FROM orders o

        INNER JOIN order_items oi
          ON oi.order_id = o.order_id

        INNER JOIN menu_items mi
          ON oi.menu_item_id = mi.menu_item_id

        INNER JOIN food_courts fc
          ON mi.food_court_id = fc.food_court_id

        WHERE
          o.checkout_id = ?

        ORDER BY
          fc.food_court_id ASC,
          o.order_id ASC,
          oi.order_item_id ASC
        `,
        [delivery.checkout_id]
      );

      // =====================================================
      // GROUP ITEMS BY FOOD COURT
      // =====================================================

      const shopMap = new Map();

      for (const row of rows) {
        const foodCourtId = Number(row.food_court_id);

        if (!shopMap.has(foodCourtId)) {
          shopMap.set(foodCourtId, {
            order_id: row.order_id,
            checkout_id: row.checkout_id,

            food_court_id: foodCourtId,

            shop_name:
              row.shop_name || "Unknown Food Court",

            shop_location:
              row.shop_location || "",

            order_status:
              row.order_status,

            pickup_status:
              row.pickup_status,

            pickup_time:
              row.pickup_time,

            total_amount: 0,

            items: [],
          });
        }

        const shop = shopMap.get(foodCourtId);

        // Add menu item
        shop.items.push({
          order_item_id: row.order_item_id,
          menu_item_id: row.menu_item_id,

          menu_name:
            row.menu_name,

          menu_image:
            row.menu_image,

          quantity:
            Number(row.quantity || 0),

          price:
            Number(row.price || 0),

          subtotal:
            Number(row.subtotal || 0),
        });

        // Calculate shop total
        shop.total_amount += Number(
          row.subtotal || 0
        );
      }

      // Convert Map to array
      delivery.shops = Array.from(
        shopMap.values()
      );
    }

    return Response.json({
      success: true,
      deliveries,
    });

  } catch (error) {
    console.error(
      "DELIVERY ORDERS ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to load delivery orders.",
      },
      { status: 500 }
    );
  }
}