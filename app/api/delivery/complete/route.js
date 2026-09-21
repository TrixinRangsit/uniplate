import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(request) {
  let uploadedPublicId = null;

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

    const deliveryPersonId = Number(session.user_id);

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

    if (
      !photo ||
      typeof photo.arrayBuffer !== "function"
    ) {
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

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(photo.type)) {
      return Response.json(
        {
          success: false,
          message:
            "Only JPG, PNG, or WEBP delivery photos are allowed.",
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
        dr.delivery_photo,
        dr.delivered_at,

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
    // UPLOAD DELIVERY PHOTO TO CLOUDINARY
    // =====================================================

    const buffer = Buffer.from(
      await photo.arrayBuffer()
    );

    const uploadResult = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "uniplate/delivery-proofs",
              resource_type: "image",
              use_filename: true,
              unique_filename: true,
              overwrite: false,
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

        uploadStream.end(buffer);
      }
    );

    if (!uploadResult?.secure_url) {
      throw new Error(
        "Delivery photo upload to Cloudinary failed."
      );
    }

    const photoUrl =
      uploadResult.secure_url;

    uploadedPublicId =
      uploadResult.public_id;

    console.log(
      "DELIVERY PHOTO UPLOADED TO CLOUDINARY:",
      photoUrl
    );

    // =====================================================
    // DATABASE TRANSACTION
    // =====================================================

    const connection =
      await db.getConnection();

    try {
      await connection.beginTransaction();

      // ===================================================
      // LOCK DELIVERY RECORD
      // ===================================================

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

      // ===================================================
      // VERIFY ASSIGNED DELIVERY PERSON
      // ===================================================

      if (
        Number(
          lockedDelivery.delivery_person_id
        ) !== deliveryPersonId
      ) {
        throw new Error(
          "This delivery is not assigned to you."
        );
      }

      // ===================================================
      // VERIFY DELIVERY STATUS
      // ===================================================

      if (
        lockedDelivery.delivery_status !==
        "out_for_delivery"
      ) {
        throw new Error(
          "This delivery is no longer out for delivery."
        );
      }

      // ===================================================
      // MARK DELIVERY COMPLETED
      // ===================================================

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

      // ===================================================
      // COMPLETE CHECKOUT
      // ===================================================

      await connection.query(
        `
        UPDATE checkout_sessions

        SET
          checkout_status = 'completed'

        WHERE checkout_id = ?
        `,
        [lockedDelivery.checkout_id]
      );

      // ===================================================
      // MARK ALL ORDERS DELIVERED
      // ===================================================

      await connection.query(
        `
        UPDATE orders

        SET
          order_status = 'delivered'

        WHERE checkout_id = ?
        `,
        [lockedDelivery.checkout_id]
      );

      // ===================================================
      // MARK QR USED
      // ===================================================

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

      // ===================================================
      // COMMIT
      // ===================================================

      await connection.commit();

      console.log(
        "DELIVERY COMPLETED:",
        {
          deliveryId,
          checkoutId:
            lockedDelivery.checkout_id,
          photoUrl,
        }
      );

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

          delivery_photo:
            photoUrl,
        },
      });

    } catch (transactionError) {
      await connection.rollback();

      // =================================================
      // DELETE CLOUDINARY PHOTO IF TRANSACTION FAILED
      // =================================================

      if (uploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(
            uploadedPublicId,
            {
              resource_type: "image",
            }
          );

          console.log(
            "Cloudinary photo deleted after transaction failure."
          );
        } catch (cleanupError) {
          console.error(
            "CLOUDINARY CLEANUP ERROR:",
            cleanupError
          );
        }
      }

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