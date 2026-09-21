import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request) {
  let connection;

  try {
    const session = await getSession();

    if (!session || session.role !== "admin") {
      return Response.json(
        {
          success: false,
          message: "Admin access required",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const checkoutId = Number(body.checkout_id);

    if (!checkoutId) {
      return Response.json(
        {
          success: false,
          message: "Invalid checkout ID",
        },
        { status: 400 }
      );
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    // ----------------------------------------
    // Get payment + checkout
    // ----------------------------------------

    const [payments] = await connection.query(
      `
      SELECT
        cp.payment_id,
        cp.checkout_id,
        cp.payment_status,

        cs.student_id,
        cs.fulfillment_type,
        cs.checkout_status

      FROM checkout_payments cp

      INNER JOIN checkout_sessions cs
        ON cp.checkout_id = cs.checkout_id

      WHERE cp.checkout_id = ?

      FOR UPDATE
      `,
      [checkoutId]
    );

    if (payments.length === 0) {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message: "Payment not found",
        },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // ----------------------------------------
    // Prevent approving twice
    // ----------------------------------------

    if (payment.payment_status === "approved") {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message: "Payment has already been approved",
        },
        { status: 400 }
      );
    }

    if (payment.payment_status === "rejected") {
      await connection.rollback();

      return Response.json(
        {
          success: false,
          message: "This payment has already been rejected",
        },
        { status: 400 }
      );
    }

    // ----------------------------------------
    // Approve payment
    // ----------------------------------------

    await connection.query(
      `
      UPDATE checkout_payments
      SET
        payment_status = 'approved',
        approved_by = ?,
        approved_at = NOW()
      WHERE checkout_id = ?
      `,
      [session.user_id, checkoutId]
    );

    // ----------------------------------------
    // Update checkout
    // ----------------------------------------

    await connection.query(
      `
      UPDATE checkout_sessions
      SET checkout_status = 'payment_approved'
      WHERE checkout_id = ?
      `,
      [checkoutId]
    );

    // ----------------------------------------
    // Confirm all orders
    // ----------------------------------------

    await connection.query(
      `
      UPDATE orders
      SET order_status = 'confirmed'
      WHERE checkout_id = ?
      `,
      [checkoutId]
    );

    // ----------------------------------------
    // Create ONE QR for the checkout
    // ----------------------------------------

    const [existingQR] = await connection.query(
      `
      SELECT qr_id
      FROM qr_receipts
      WHERE checkout_id = ?
      LIMIT 1
      `,
      [checkoutId]
    );

    let qrToken;

    if (existingQR.length === 0) {
      qrToken = crypto.randomBytes(32).toString("hex");

      await connection.query(
        `
        INSERT INTO qr_receipts
        (
          checkout_id,
          qr_token,
          status
        )
        VALUES (?, ?, 'active')
        `,
        [checkoutId, qrToken]
      );
    } else {
      const [qrRows] = await connection.query(
        `
        SELECT qr_token
        FROM qr_receipts
        WHERE checkout_id = ?
        LIMIT 1
        `,
        [checkoutId]
      );

      qrToken = qrRows[0]?.qr_token || null;
    }

    // ----------------------------------------
    // DELIVERY
    // ----------------------------------------
    //
    // If this is a delivery checkout,
    // create a delivery record automatically.
    //
    // The delivery person can then see it
    // in their personal dashboard.
    // ----------------------------------------

    if (payment.fulfillment_type === "delivery") {
      const [existingDelivery] = await connection.query(
        `
        SELECT delivery_id
        FROM delivery_records
        WHERE checkout_id = ?
        LIMIT 1
        `,
        [checkoutId]
      );

      if (existingDelivery.length === 0) {
        await connection.query(
          `
          INSERT INTO delivery_records
          (
            checkout_id,
            delivery_person_id,
            delivery_status
          )
          VALUES (?, NULL, 'waiting')
          `,
          [checkoutId]
        );
      }
    }

    await connection.commit();

    return Response.json({
      success: true,
      message: "Payment approved successfully",
      checkout_id: checkoutId,
      fulfillment_type: payment.fulfillment_type,
      qr_generated: !!qrToken,
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      "ADMIN PAYMENT APPROVE ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to approve payment",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}