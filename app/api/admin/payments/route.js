import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
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

    const [payments] = await db.query(`
      SELECT
        cp.payment_id,
        cp.checkout_id,
        cp.amount,
        cp.payment_method,
        cp.payment_status,
        cp.payment_proof,
        cp.submitted_at,
        cp.approved_at,
        cp.rejection_reason,

        cs.student_id,
        cs.fulfillment_type,
        cs.subtotal,
        cs.delivery_fee,
        cs.total_amount,
        cs.building_number,
        cs.delivery_phone,
        cs.delivery_note,
        cs.checkout_status,
        cs.created_at,

        u.name AS student_name,
        u.email AS student_email,
        u.phone AS student_phone

      FROM checkout_payments cp

      INNER JOIN checkout_sessions cs
        ON cp.checkout_id = cs.checkout_id

      INNER JOIN users u
        ON cs.student_id = u.user_id

      ORDER BY cp.submitted_at DESC
    `);

    return Response.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error(
      "ADMIN PAYMENTS ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to load payment submissions",
      },
      { status: 500 }
    );
  }
}