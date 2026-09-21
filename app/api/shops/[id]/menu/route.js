import db from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Shop ID is required",
        },
        { status: 400 }
      );
    }

    // Get shop information
    const [shops] = await db.query(
      `
      SELECT
        user_id,
        name,
        email,
        phone,
        role,
        approval_status,
        shop_image
      FROM users
      WHERE user_id = ?
        AND role = 'shopowner'
      LIMIT 1
      `,
      [id]
    );

    if (shops.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Shop not found",
        },
        { status: 404 }
      );
    }

    const shop = shops[0];

    // Only approved shops can be viewed
    if (shop.approval_status !== "approved") {
      return Response.json(
        {
          success: false,
          message: "This shop is not available",
        },
        { status: 403 }
      );
    }

    // Get only this shop owner's menu items
    const [menuItems] = await db.query(
      `
      SELECT
        menu_item_id,
        shop_owner_id,
        food_court_id,
        name,
        description,
        price,
        image,
        category,
        availability,
        created_at
      FROM menu_items
      WHERE shop_owner_id = ?
      ORDER BY category ASC, menu_item_id ASC
      `,
      [id]
    );

    return Response.json({
      success: true,
      shop: {
        user_id: shop.user_id,
        name: shop.name,
        email: shop.email,
        phone: shop.phone,
        shop_image: shop.shop_image,
      },
      menuItems,
    });
  } catch (error) {
    console.error("PUBLIC SHOP MENU ERROR:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message || "Failed to load shop menu",
      },
      { status: 500 }
    );
  }
}