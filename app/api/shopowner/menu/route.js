import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const session = await getSession();

    console.log("MENU GET SESSION:", session);

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (session.role !== "shopowner") {
      return Response.json(
        {
          success: false,
          message: "Shop Owner access required",
        },
        { status: 403 }
      );
    }

    const [menuItems] = await db.query(
      `
      SELECT
        mi.menu_item_id,
        mi.shop_owner_id,
        mi.food_court_id,
        fc.name AS food_court_name,
        fc.location AS food_court_location,
        mi.name,
        mi.description,
        mi.price,
        mi.image,
        mi.category,
        mi.availability,
        mi.created_at
      FROM menu_items mi
      LEFT JOIN food_courts fc
        ON mi.food_court_id = fc.food_court_id
      WHERE mi.shop_owner_id = ?
      ORDER BY mi.category ASC, mi.menu_item_id ASC
      `,
      [session.user_id]
    );

    console.log(
      `MENU GET: Shop Owner ${session.user_id} has ${menuItems.length} items`
    );

    return Response.json({
      success: true,
      menuItems,
    });
  } catch (error) {
    console.error("MENU GET ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to load menu",
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession();

    console.log("MENU POST SESSION:", session);

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (session.role !== "shopowner") {
      return Response.json(
        {
          success: false,
          message: "Shop Owner access required",
        },
        { status: 403 }
      );
    }

    /*
      IMPORTANT

      The food court is NOT taken from the frontend.

      The logged-in shop owner determines
      which food court the menu belongs to.
    */

    const [owners] = await db.query(
      `
      SELECT
        user_id,
        name,
        food_court_id
      FROM users
      WHERE user_id = ?
        AND role = 'shopowner'
      LIMIT 1
      `,
      [session.user_id]
    );

    if (owners.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Shop owner account not found",
        },
        { status: 404 }
      );
    }

    const owner = owners[0];

    if (!owner.food_court_id) {
      return Response.json(
        {
          success: false,
          message:
            "Your shop owner account is not assigned to a food court.",
        },
        { status: 400 }
      );
    }

    /*
      Verify the food court actually exists
    */

    const [foodCourts] = await db.query(
      `
      SELECT
        food_court_id,
        name,
        location
      FROM food_courts
      WHERE food_court_id = ?
        AND status = 'active'
      LIMIT 1
      `,
      [owner.food_court_id]
    );

    if (foodCourts.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Assigned food court was not found or is inactive.",
        },
        { status: 400 }
      );
    }

    const foodCourt = foodCourts[0];

    const formData = await request.formData();

    const name = formData.get("name");
    const description = formData.get("description");
    const price = formData.get("price");
    const category = formData.get("category");
    const image = formData.get("image");

    if (!name || !price || !category) {
      return Response.json(
        {
          success: false,
          message: "Name, price, and category are required",
        },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid price",
        },
        { status: 400 }
      );
    }

    let imagePath = null;

    /*
      Save menu image
    */

    if (
      image &&
      typeof image === "object" &&
      image.size > 0
    ) {
      if (image.size > 5 * 1024 * 1024) {
        return Response.json(
          {
            success: false,
            message: "Image must be smaller than 5 MB",
          },
          { status: 400 }
        );
      }

      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(image.type)) {
        return Response.json(
          {
            success: false,
            message:
              "Only JPG, JPEG, PNG, and WEBP images are allowed",
          },
          { status: 400 }
        );
      }

      const uploadDir = path.join(
        process.cwd(),
        "public",
        "uploads"
      );

      await fs.mkdir(uploadDir, {
        recursive: true,
      });

      const extension =
        image.name?.split(".").pop()?.toLowerCase() || "jpg";

      const safeExtension = [
        "jpg",
        "jpeg",
        "png",
        "webp",
      ].includes(extension)
        ? extension
        : "jpg";

      const fileName =
        `menu-${session.user_id}-${Date.now()}.${safeExtension}`;

      const filePath = path.join(
        uploadDir,
        fileName
      );

      const buffer = Buffer.from(
        await image.arrayBuffer()
      );

      await fs.writeFile(
        filePath,
        buffer
      );

      imagePath = `/uploads/${fileName}`;
    }

    /*
      CREATE MENU

      food_court_id comes from the logged-in
      shop owner's assigned food court.

      Example:

      user 9  → food court 2 → Japanese
      user 11 → food court 3 → Thai
      user 12 → food court 4 → Burmese
    */

    const [result] = await db.query(
      `
      INSERT INTO menu_items
      (
        food_court_id,
        shop_owner_id,
        name,
        description,
        price,
        image,
        category,
        availability
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        owner.food_court_id,
        session.user_id,
        name,
        description || null,
        numericPrice,
        imagePath,
        category,
        true,
      ]
    );

    console.log(
      `MENU CREATED:
       item=${result.insertId}
       owner=${session.user_id}
       foodCourt=${owner.food_court_id}
       foodCourtName=${foodCourt.name}`
    );

    return Response.json(
      {
        success: true,
        message: "Menu item added successfully",

        menuItem: {
          menu_item_id: result.insertId,
          shop_owner_id: session.user_id,
          food_court_id: owner.food_court_id,
          food_court_name: foodCourt.name,
          food_court_location: foodCourt.location,
          name,
          description: description || null,
          price: numericPrice,
          image: imagePath,
          category,
          availability: true,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("MENU POST ERROR:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to add menu item",
      },
      { status: 500 }
    );
  }
}