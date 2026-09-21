import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const session = await getSession();

    console.log("ACCOUNT GET SESSION:", session);

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "You are not logged in.",
        },
        { status: 401 }
      );
    }

    const [users] = await db.query(
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
      `,
      [session.user_id]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("ACCOUNT GET ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to load account.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();

    console.log("ACCOUNT PUT SESSION:", session);

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "You are not logged in.",
        },
        { status: 401 }
      );
    }

    /*
     * Get current user
     */
    const [users] = await db.query(
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
      `,
      [session.user_id]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "User account not found.",
        },
        { status: 404 }
      );
    }

    const currentUser = users[0];

    /*
     * Make sure this account is Shop Owner
     */
    if (currentUser.role !== "shopowner") {
      return Response.json(
        {
          success: false,
          message:
            "This account is not a Shop Owner account.",
        },
        { status: 403 }
      );
    }

    /*
     * Read FormData
     */
    const formData = await request.formData();

    const name = formData.get("name");
    const image = formData.get("image");

    console.log("ACCOUNT NAME:", name);
    console.log("ACCOUNT IMAGE:", image);

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return Response.json(
        {
          success: false,
          message: "Shop name is required.",
        },
        { status: 400 }
      );
    }

    const shopName = name.trim();

    /*
     * Keep old image if no new image is selected
     */
    let shopImage = currentUser.shop_image || null;

    /*
     * ==========================
     * SAVE NEW IMAGE
     * ==========================
     */

    if (
      image &&
      typeof image !== "string" &&
      image.size > 0
    ) {
      console.log("Uploading image...");
      console.log("Image type:", image.type);
      console.log("Image size:", image.size);

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(image.type)) {
        return Response.json(
          {
            success: false,
            message:
              "Only JPG, PNG and WebP images are allowed.",
          },
          { status: 400 }
        );
      }

      if (image.size > 5 * 1024 * 1024) {
        return Response.json(
          {
            success: false,
            message:
              "Shop image must be smaller than 5 MB.",
          },
          { status: 400 }
        );
      }

      /*
       * Create public/uploads
       */
      const uploadDirectory = path.join(
        process.cwd(),
        "public",
        "uploads"
      );

      await fs.mkdir(uploadDirectory, {
        recursive: true,
      });

      /*
       * File extension
       */
      let extension = ".jpg";

      if (image.type === "image/png") {
        extension = ".png";
      }

      if (image.type === "image/webp") {
        extension = ".webp";
      }

      /*
       * Create unique filename
       */
      const fileName =
        `shop-${currentUser.user_id}-${Date.now()}${extension}`;

      const filePath = path.join(
        uploadDirectory,
        fileName
      );

      /*
       * Convert image to Buffer
       */
      const bytes = await image.arrayBuffer();

      const buffer = Buffer.from(bytes);

      /*
       * Save image to public/uploads
       */
      await fs.writeFile(filePath, buffer);

      /*
       * Path saved into MySQL
       */
      shopImage = `/uploads/${fileName}`;

      console.log("IMAGE SAVED:", filePath);
      console.log("DATABASE IMAGE PATH:", shopImage);
    }

    /*
     * ==========================
     * UPDATE MYSQL
     * ==========================
     */

    console.log("UPDATING MYSQL...");
    console.log("User ID:", currentUser.user_id);
    console.log("Shop Name:", shopName);
    console.log("Shop Image:", shopImage);

    const [updateResult] = await db.query(
      `
      UPDATE users
      SET
        name = ?,
        shop_image = ?
      WHERE user_id = ?
      `,
      [
        shopName,
        shopImage,
        currentUser.user_id,
      ]
    );

    console.log(
      "MYSQL UPDATE RESULT:",
      updateResult
    );

    /*
     * Verify database
     */
    const [updatedUsers] = await db.query(
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
      `,
      [currentUser.user_id]
    );

    console.log(
      "UPDATED USER:",
      updatedUsers[0]
    );

    return Response.json({
      success: true,
      message: "Shop account saved successfully.",
      user: updatedUsers[0],
    });
  } catch (error) {
    console.error(
      "ACCOUNT UPDATE ERROR:",
      error
    );

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to save shop account.",
      },
      { status: 500 }
    );
  }
}