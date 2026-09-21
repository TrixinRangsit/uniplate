import db from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = await getSession();

    if (!session || session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student login required",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(request.url);

    const checkoutId = Number(
      searchParams.get("checkout_id")
    );

    if (!checkoutId) {
      return Response.json(
        {
          success: false,
          message: "Checkout ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // ==========================================
    // GET CHECKOUT + PAYMENT STATUS
    // ==========================================

    const [rows] = await db.query(
      `
      SELECT
        cs.checkout_id,
        cs.student_id,
        cs.checkout_status,

        cp.payment_id,
        cp.payment_status,
        cp.rejection_reason

      FROM checkout_sessions cs

      LEFT JOIN checkout_payments cp
        ON cp.checkout_id = cs.checkout_id

      WHERE cs.checkout_id = ?
        AND cs.student_id = ?

      LIMIT 1
      `,
      [
        checkoutId,
        session.user_id,
      ]
    );

    if (rows.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Checkout not found",
        },
        {
          status: 404,
        }
      );
    }

    const checkout = rows[0];

    // ==========================================
    // PAYMENT APPROVED
    // ==========================================

    if (
      checkout.payment_status === "approved"
    ) {
      return Response.json({
        success: true,

        status: "payment_approved",

        checkout_id:
          checkout.checkout_id,

        payment_status:
          checkout.payment_status,

        checkout_status:
          checkout.checkout_status,

        rejection_reason: null,
      });
    }

    // ==========================================
    // PAYMENT REJECTED
    // ==========================================

    if (
      checkout.payment_status === "rejected"
    ) {
      return Response.json({
        success: true,

        status: "payment_rejected",

        checkout_id:
          checkout.checkout_id,

        payment_status:
          checkout.payment_status,

        checkout_status:
          checkout.checkout_status,

        rejection_reason:
          checkout.rejection_reason ||
          "Your payment was rejected by admin.",
      });
    }

    // ==========================================
    // PAYMENT SUBMITTED
    // ==========================================

    if (
      checkout.payment_status === "submitted"
    ) {
      return Response.json({
        success: true,

        status: "payment_submitted",

        checkout_id:
          checkout.checkout_id,

        payment_status:
          checkout.payment_status,

        checkout_status:
          checkout.checkout_status,

        rejection_reason: null,
      });
    }

    // ==========================================
    // PAYMENT PENDING
    // ==========================================

    return Response.json({
      success: true,

      status: "payment_pending",

      checkout_id:
        checkout.checkout_id,

      payment_status:
        checkout.payment_status ||
        "pending",

      checkout_status:
        checkout.checkout_status,

      rejection_reason: null,
    });

  } catch (error) {
    console.error(
      "PAYMENT STATUS ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          "Unable to check payment status",
      },
      {
        status: 500,
      }
    );
  }
}