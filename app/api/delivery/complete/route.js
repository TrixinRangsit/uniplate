import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function POST(request) {
  try {
    // =====================================================
    // AUTHENTICATION
    // =====================================================

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

    if (session.role !== "delivery") {
      return Response.json(
        {
          success: false,
          message: "Delivery access only.",
        },
        { status: 403 }
      );
    }

    const deliveryPersonId = Number(
      session.user_id
    );

    // =====================================================
    // FORM DATA
    // =====================================================

    const formData = await request.formData();

    const deliveryId = Number(
      formData.get("delivery_id")
    );

    const photo = formData.get("photo");

    if (!deliveryId) {
      return Response.json(
        {
          success: false,
          message: "Delivery ID is required.",
        },
        { status: 400 }
      );
    }

    if (!photo || typeof photo.arrayBuffer !== "function") {
      return Response.json(
        {
          success: false,
          message: "Delivery photo is required.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // VALIDATE PHOTO
    // =====================================================

    if (!photo.type.startsWith("image/")) {
      return Response.json(
        {
          success: false,
          message: "Please upload an image file.",
        },
        { status: 400 }
      );
    }

    if (photo.size > 5 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          message:
            "Delivery photo must be smaller than 5 MB.",
        },
        { status: 400 }
      );
    }

    // =====================================================
    // FIND DELIVERY
    // =====================================================

    const [deliveries] = await db.query(
      `
      SELECT
        dr.delivery_id,
        dr.checkout_id,
        dr.delivery_person_id,
        dr.delivery_status,

        cs.checkout_status

      FROM delivery_records dr

      INNER JOIN checkout_sessions cs
        ON dr.checkout_id = cs.checkout_id

      WHERE dr.delivery_id = ?

      LIMIT 1
      `,
      [deliveryId]
    );

    if (deliveries.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Delivery record not found.",
        },
        { status: 404 }
      );
    }

    const delivery = deliveries[0];

    // =====================================================
    // VERIFY DELIVERY PERSON
    // =====================================================

    if (
      Number(delivery.delivery_person_id) !==
      deliveryPersonId
    ) {
      return Response.json(
        {
          success: false,
          message:
            "This delivery is not assigned to you.",
        },
        { status: 403 }
      );
    }

    // =====================================================
    // VERIFY STATUS
    // =====================================================

    if (
      delivery.delivery_status !==
      "out_for_delivery"
    ) {
      return Response.json(
        {
          success: false,
          message:
            `Delivery cannot be completed from status "${delivery.delivery_status}".`,
        },
        { status: 400 }
      );
    }

    // =====================================================
    // SAVE PHOTO
    // =====================================================

    const bytes = await photo.arrayBuffer();

    const buffer = Buffer.from(bytes);

    let extension = "jpg";

    if (photo.type === "image/png") {
      extension = "png";
    } else if (photo.type === "image/webp") {
      extension = "webp";
    } else if (photo.type === "image/jpeg") {
      extension = "jpg";
    }

    const fileName =
      `delivery-${delivery.checkout_id}-${Date.now()}.${extension}`;

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads"
    );

    await fs.mkdir(uploadDirectory, {
      recursive: true,
    });

    const filePath = path.join(
      uploadDirectory,
      fileName
    );

    await fs.writeFile(filePath, buffer);

    const photoUrl =
      `/uploads/${fileName}`;

    // =====================================================
    // DATABASE TRANSACTION
    // =====================================================

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      // -----------------------------------------------
      // LOCK DELIVERY RECORD
      // -----------------------------------------------

      const [lockedDeliveries] =
        await connection.query(
          `
          SELECT
            delivery_id,
            checkout_id,
            delivery_person_id,
            delivery_status

          FROM delivery_records

          WHERE delivery_id = ?

          FOR UPDATE
          `,
          [deliveryId]
        );

      if (lockedDeliveries.length === 0) {
        throw new Error(
          "Delivery record not found."
        );
      }

      const lockedDelivery =
        lockedDeliveries[0];

      if (
        Number(
          lockedDelivery.delivery_person_id
        ) !== deliveryPersonId
      ) {
        throw new Error(
          "This delivery is not assigned to you."
        );
      }

      if (
        lockedDelivery.delivery_status !==
        "out_for_delivery"
      ) {
        throw new Error(
          "This delivery is no longer out for delivery."
        );
      }

      // -----------------------------------------------
      // MARK DELIVERY COMPLETED
      // -----------------------------------------------

      await connection.query(
        `
        UPDATE delivery_records

        SET
          delivery_status = 'delivered',
          delivery_photo = ?,
          delivered_at = NOW()

        WHERE delivery_id = ?
        `,
        [
          photoUrl,
          deliveryId,
        ]
      );

      // -----------------------------------------------
      // COMPLETE CHECKOUT
      // -----------------------------------------------

      await connection.query(
        `
        UPDATE checkout_sessions

        SET checkout_status = 'completed'

        WHERE checkout_id = ?
        `,
        [lockedDelivery.checkout_id]
      );

      // -----------------------------------------------
      // MARK ALL ORDERS DELIVERED
      // -----------------------------------------------

      await connection.query(
        `
        UPDATE orders

        SET order_status = 'delivered'

        WHERE checkout_id = ?
        `,
        [lockedDelivery.checkout_id]
      );

      // -----------------------------------------------
      // MARK QR USED
      // -----------------------------------------------

      await connection.query(
        `
        UPDATE qr_receipts

        SET
          status = 'used',
          used_at = NOW(),
          scanned_by = ?

        WHERE checkout_id = ?
          AND status = 'active'
        `,
        [
          deliveryPersonId,
          lockedDelivery.checkout_id,
        ]
      );

      await connection.commit();

      return Response.json({
        success: true,
        message:
          "Delivery completed successfully.",

        delivery: {
          delivery_id: deliveryId,
          checkout_id:
            lockedDelivery.checkout_id,
          delivery_status:
            "delivered",
          delivery_photo: photoUrl,
        },
      });
    } catch (transactionError) {
      await connection.rollback();

      // Delete uploaded photo if database transaction failed
      try {
        await fs.unlink(filePath);
      } catch {}

      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error(
      "DELIVERY COMPLETE ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error?.message ||
          "Unable to complete delivery.",
      },
      { status: 500 }
    );
  }
}