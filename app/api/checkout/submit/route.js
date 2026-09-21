import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(request) {
  let connection;

  try {
    // Check student login
    const session = await getSession();

    if (!session || session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student login required",
        },
        { status: 401 }
      );
    }

    // Read FormData
    const formData = await request.formData();

    const slip = formData.get("slip");
    const checkoutRaw = formData.get("checkout");
    const cartRaw = formData.get("cart");

    if (!slip || typeof slip === "string") {
      return Response.json(
        {
          success: false,
          message: "Payment slip is required",
        },
        { status: 400 }
      );
    }

    if (!checkoutRaw || !cartRaw) {
      return Response.json(
        {
          success: false,
          message: "Checkout information is missing",
        },
        { status: 400 }
      );
    }

    let checkoutData;
    let cart;

    try {
      checkoutData = JSON.parse(checkoutRaw);
      cart = JSON.parse(cartRaw);
    } catch {
      return Response.json(
        {
          success: false,
          message: "Invalid checkout data",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Your cart is empty",
        },
        { status: 400 }
      );
    }

    const fulfillmentType =
      checkoutData.delivery_method === "delivery"
        ? "delivery"
        : "pickup";

    // Validate delivery information
    if (fulfillmentType === "delivery") {
      if (!checkoutData.building_number?.trim()) {
        return Response.json(
          {
            success: false,
            message: "Building / room number is required",
          },
          { status: 400 }
        );
      }

      if (!checkoutData.phone?.trim()) {
        return Response.json(
          {
            success: false,
            message: "Phone number is required",
          },
          { status: 400 }
        );
      }
    }

    // Validate payment slip
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(slip.type)) {
      return Response.json(
        {
          success: false,
          message: "Only JPG, PNG, or WEBP payment slips are allowed",
        },
        { status: 400 }
      );
    }

    // Maximum 5 MB
    if (slip.size > 5 * 1024 * 1024) {
      return Response.json(
        {
          success: false,
          message: "Payment slip must be smaller than 5 MB",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * Verify every cart item from the database
     * --------------------------------------------------
     */

    const menuIds = cart
      .map((item) => Number(item.menu_item_id))
      .filter(Boolean);

    if (menuIds.length !== cart.length) {
      return Response.json(
        {
          success: false,
          message: "Invalid cart item",
        },
        { status: 400 }
      );
    }

    const placeholders = menuIds.map(() => "?").join(",");

    const [menuRows] = await db.query(
      `
      SELECT
        mi.menu_item_id,
        mi.name,
        mi.price,
        mi.food_court_id,
        mi.shop_owner_id,
        mi.availability,
        fc.name AS shop_name
      FROM menu_items mi
      LEFT JOIN food_courts fc
        ON mi.food_court_id = fc.food_court_id
      WHERE mi.menu_item_id IN (${placeholders})
      `,
      menuIds
    );

    if (menuRows.length !== cart.length) {
      return Response.json(
        {
          success: false,
          message: "One or more food items no longer exist",
        },
        { status: 400 }
      );
    }

    const menuMap = new Map(
      menuRows.map((item) => [
        Number(item.menu_item_id),
        item,
      ])
    );

    /*
     * --------------------------------------------------
     * Group items by shop owner
     * --------------------------------------------------
     */

    const shopGroups = new Map();

    for (const cartItem of cart) {
      const menuItem = menuMap.get(
        Number(cartItem.menu_item_id)
      );

      if (!menuItem) {
        return Response.json(
          {
            success: false,
            message: `Food item ${cartItem.menu_item_id} was not found`,
          },
          { status: 400 }
        );
      }

      if (!menuItem.availability) {
        return Response.json(
          {
            success: false,
            message: `${menuItem.name} is currently unavailable`,
          },
          { status: 400 }
        );
      }

      if (!menuItem.shop_owner_id) {
        return Response.json(
          {
            success: false,
            message: `${menuItem.name} does not have a shop owner`,
          },
          { status: 400 }
        );
      }

      const quantity = Math.max(
        1,
        Number(cartItem.quantity) || 1
      );

      const key = String(menuItem.shop_owner_id);

      if (!shopGroups.has(key)) {
        shopGroups.set(key, {
          shop_owner_id: menuItem.shop_owner_id,
          food_court_id: menuItem.food_court_id,
          shop_name:
            menuItem.shop_name || "Food Shop",
          items: [],
          subtotal: 0,
        });
      }

      const group = shopGroups.get(key);

      const price = Number(menuItem.price);
      const itemSubtotal = price * quantity;

      group.items.push({
        menu_item_id: menuItem.menu_item_id,
        quantity,
        price,
        customization:
          cartItem.customization || null,
      });

      group.subtotal += itemSubtotal;
    }

    const groups = Array.from(shopGroups.values());

    const subtotal = groups.reduce(
      (sum, shop) => sum + shop.subtotal,
      0
    );

    // ฿10 per different shop for delivery
    const deliveryFee =
      fulfillmentType === "delivery"
        ? groups.length * 10
        : 0;

    const totalAmount = subtotal + deliveryFee;

    /*
     * --------------------------------------------------
     * Upload payment slip to Cloudinary
     * --------------------------------------------------
     */

    const buffer = Buffer.from(
      await slip.arrayBuffer()
    );

    const uploadResult = await new Promise(
      (resolve, reject) => {
        const uploadStream =
          cloudinary.uploader.upload_stream(
            {
              folder: "uniplate/payment-slips",
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
        "Payment slip upload to Cloudinary failed"
      );
    }

    const paymentProof = uploadResult.secure_url;

    /*
     * --------------------------------------------------
     * Database transaction
     * --------------------------------------------------
     */

    connection = await db.getConnection();

    await connection.beginTransaction();

    // Create checkout session
    const [checkoutResult] = await connection.query(
      `
      INSERT INTO checkout_sessions
      (
        student_id,
        fulfillment_type,
        subtotal,
        delivery_fee,
        total_amount,
        building_number,
        delivery_phone,
        delivery_note,
        checkout_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'payment_submitted')
      `,
      [
        session.user_id,
        fulfillmentType,
        subtotal,
        deliveryFee,
        totalAmount,
        fulfillmentType === "delivery"
          ? checkoutData.building_number.trim()
          : null,
        fulfillmentType === "delivery"
          ? checkoutData.phone.trim()
          : null,
        fulfillmentType === "delivery"
          ? checkoutData.delivery_note?.trim() || null
          : null,
      ]
    );

    const checkoutId =
      checkoutResult.insertId;

    /*
     * --------------------------------------------------
     * Create one order for each shop
     * --------------------------------------------------
     */

    for (const shop of groups) {
      const shopDeliveryFee =
        fulfillmentType === "delivery"
          ? 10
          : 0;

      const shopTotal =
        shop.subtotal + shopDeliveryFee;

      const [orderResult] =
        await connection.query(
          `
          INSERT INTO orders
          (
            checkout_id,
            student_id,
            food_court_id,
            total_amount,
            delivery_fee,
            fulfillment_type,
            building_number,
            delivery_phone,
            delivery_note,
            order_status,
            pickup_status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'waiting')
          `,
          [
            checkoutId,
            session.user_id,
            shop.food_court_id,
            shopTotal,
            shopDeliveryFee,
            fulfillmentType,
            fulfillmentType === "delivery"
              ? checkoutData.building_number.trim()
              : null,
            fulfillmentType === "delivery"
              ? checkoutData.phone.trim()
              : null,
            fulfillmentType === "delivery"
              ? checkoutData.delivery_note?.trim() || null
              : null,
          ]
        );

      const orderId =
        orderResult.insertId;

      // Add order items
      for (const item of shop.items) {
        await connection.query(
          `
          INSERT INTO order_items
          (
            order_id,
            menu_item_id,
            quantity,
            price,
            customization
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            orderId,
            item.menu_item_id,
            item.quantity,
            item.price,
            item.customization,
          ]
        );
      }
    }

    /*
     * --------------------------------------------------
     * Create payment record
     * --------------------------------------------------
     */

    await connection.query(
      `
      INSERT INTO checkout_payments
      (
        checkout_id,
        amount,
        payment_method,
        payment_status,
        payment_proof,
        submitted_at
      )
      VALUES (?, ?, 'QR', 'submitted', ?, NOW())
      `,
      [
        checkoutId,
        totalAmount,
        paymentProof,
      ]
    );

    await connection.commit();

    return Response.json(
      {
        success: true,
        message:
          "Payment slip submitted successfully",
        checkout_id: checkoutId,
        payment_status: "submitted",
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }

    console.error(
      "CHECKOUT SUBMIT ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Unable to submit payment",
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}