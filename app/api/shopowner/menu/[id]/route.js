import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function DELETE(request, { params }) {
  try {
    const session = await getSession();

    console.log("MENU DELETE SESSION:", session);

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

    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Menu item ID is required",
        },
        { status: 400 }
      );
    }

    /*
      IMPORTANT:
      We check BOTH:
      menu_item_id
      AND
      shop_owner_id

      This prevents one Shop Owner from deleting
      another Shop Owner's menu.
    */
    const [items] = await db.query(
      `
      SELECT
        menu_item_id,
        shop_owner_id,
        image
      FROM menu_items
      WHERE menu_item_id = ?
        AND shop_owner_id = ?
      `,
      [id, session.user_id]
    );

    if (items.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Menu item not found or does not belong to your shop",
        },
        { status: 404 }
      );
    }

    const item = items[0];

    await db.query(
      `
      DELETE FROM menu_items
      WHERE menu_item_id = ?
        AND shop_owner_id = ?
      `,
      [id, session.user_id]
    );

    // Delete image from server
    if (item.image) {
      try {
        const imagePath = path.join(
          process.cwd(),
          "public",
          item.image.replace(/^\/+/, "")
        );

        await fs.unlink(imagePath);
      } catch (imageError) {
        console.log("Could not delete image:", imageError.message);
      }
    }

    console.log(
      `MENU DELETED: item ${id} by Shop Owner ${session.user_id}`
    );

    return Response.json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("MENU DELETE ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to delete menu item",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getSession();

    console.log("MENU PUT SESSION:", session);

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

    const { id } = await params;

    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Menu item ID is required",
        },
        { status: 400 }
      );
    }

    // Make sure this menu belongs to the logged-in Shop Owner
    const [items] = await db.query(
      `
      SELECT
        menu_item_id,
        shop_owner_id,
        image
      FROM menu_items
      WHERE menu_item_id = ?
        AND shop_owner_id = ?
      `,
      [id, session.user_id]
    );

    if (items.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Menu item not found or does not belong to your shop",
        },
        { status: 404 }
      );
    }

    const oldItem = items[0];

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

    let imagePath = oldItem.image;

    // If a new image was uploaded
    if (image && typeof image === "object" && image.size > 0) {
      const uploadDir = path.join(process.cwd(), "public", "uploads");

      await fs.mkdir(uploadDir, {
        recursive: true,
      });

      const extension =
        image.name?.split(".").pop()?.toLowerCase() || "jpg";

      const safeExtension = ["jpg", "jpeg", "png", "webp"].includes(
        extension
      )
        ? extension
        : "jpg";

      const fileName = `menu-${session.user_id}-${Date.now()}.${safeExtension}`;

      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(await image.arrayBuffer());

      await fs.writeFile(filePath, buffer);

      imagePath = `/uploads/${fileName}`;

      // Delete old image
      if (oldItem.image) {
        try {
          const oldImagePath = path.join(
            process.cwd(),
            "public",
            oldItem.image.replace(/^\/+/, "")
          );

          await fs.unlink(oldImagePath);
        } catch (imageError) {
          console.log(
            "Could not delete old image:",
            imageError.message
          );
        }
      }
    }

    await db.query(
      `
      UPDATE menu_items
      SET
        name = ?,
        description = ?,
        price = ?,
        image = ?,
        category = ?
      WHERE menu_item_id = ?
        AND shop_owner_id = ?
      `,
      [
        name,
        description || null,
        price,
        imagePath,
        category,
        id,
        session.user_id,
      ]
    );

    console.log(
      `MENU UPDATED: item ${id} by Shop Owner ${session.user_id}`
    );

    return Response.json({
      success: true,
      message: "Menu item updated successfully",
    });
  } catch (error) {
    console.error("MENU PUT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to update menu item",
      },
      { status: 500 }
    );
  }
}