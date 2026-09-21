import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    // Check student login
    const session = await getSession();

    if (!session || session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student access required",
        },
        { status: 403 }
      );
    }

    // Next.js 16: params must be awaited
    const resolvedParams = await params;

    const checkoutId = Number(
      resolvedParams?.checkoutId
    );

    if (!checkoutId) {
      return Response.json(
        {
          success: false,
          message: "Invalid checkout ID",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // GET CHECKOUT
    // ==========================================

    const [checkoutRows] = await db.query(
      `
      SELECT
        checkout_id,
        student_id,
        fulfillment_type,
        subtotal,
        delivery_fee,
        total_amount,
        building_number,
        delivery_phone,
        delivery_note,
        checkout_status,
        created_at,
        updated_at
      FROM checkout_sessions
      WHERE checkout_id = ?
        AND student_id = ?
      LIMIT 1
      `,
      [
        checkoutId,
        session.user_id,
      ]
    );

    if (checkoutRows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Receipt not found",
        },
        { status: 404 }
      );
    }

    const checkout = checkoutRows[0];

    // ==========================================
    // GET PAYMENT
    // ==========================================

    const [paymentRows] = await db.query(
      `
      SELECT
        payment_id,
        checkout_id,
        amount,
        payment_method,
        payment_status,
        payment_proof,
        submitted_at,
        approved_by,
        approved_at,
        rejection_reason
      FROM checkout_payments
      WHERE checkout_id = ?
      LIMIT 1
      `,
      [checkoutId]
    );

    const payment =
      paymentRows.length > 0
        ? paymentRows[0]
        : null;

    // ==========================================
    // GET QR RECEIPT
    // ==========================================

    const [qrRows] = await db.query(
      `
      SELECT
        qr_id,
        checkout_id,
        qr_token,
        status,
        generated_at,
        used_at,
        scanned_by
      FROM qr_receipts
      WHERE checkout_id = ?
      LIMIT 1
      `,
      [checkoutId]
    );

    const qr =
      qrRows.length > 0
        ? qrRows[0]
        : null;

    // ==========================================
    // GET ORDERS
    // ==========================================

    const [orderRows] = await db.query(
      `
      SELECT
        o.order_id,
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
        fc.name AS shop_name
      FROM orders o
      LEFT JOIN food_courts fc
        ON o.food_court_id = fc.food_court_id
      WHERE o.checkout_id = ?
      ORDER BY o.order_id ASC
      `,
      [checkoutId]
    );

    const orders = [];

    for (const order of orderRows) {
      const [items] = await db.query(
        `
        SELECT
          oi.order_item_id,
          oi.menu_item_id,
          oi.quantity,
          oi.price,
          oi.subtotal,
          oi.customization,
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

      orders.push({
        order_id: order.order_id,
        food_court_id: order.food_court_id,
        shop_name: order.shop_name,
        total_amount: order.total_amount,
        delivery_fee: order.delivery_fee,
        fulfillment_type:
          order.fulfillment_type,
        building_number:
          order.building_number,
        delivery_phone:
          order.delivery_phone,
        delivery_note:
          order.delivery_note,
        order_status:
          order.order_status,
        pickup_status:
          order.pickup_status,
        pickup_time:
          order.pickup_time,
        created_at:
          order.created_at,
        items,
      });
    }

    // ==========================================
    // GET DELIVERY INFORMATION
    // ==========================================

    let delivery = null;

    if (
      checkout.fulfillment_type ===
      "delivery"
    ) {
      const [deliveryRows] =
        await db.query(
          `
          SELECT
            delivery_id,
            checkout_id,
            delivery_person_id,
            delivery_status,
            delivery_photo,
            delivered_at,
            created_at,
            updated_at
          FROM delivery_records
          WHERE checkout_id = ?
          LIMIT 1
          `,
          [checkoutId]
        );

      if (deliveryRows.length > 0) {
        delivery =
          deliveryRows[0];
      }
    }

    // ==========================================
    // RETURN RECEIPT
    // ==========================================

    return Response.json({
      success: true,
      checkout,
      payment,
      qr,
      orders,
      delivery,
    });

  } catch (error) {
    console.error(
      "RECEIPT API ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to load receipt",
      },
      { status: 500 }
    );
  }
}