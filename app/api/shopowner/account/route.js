import db from "@/lib/db";
import { getSession } from "@/lib/auth";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| Cloudinary Upload
|--------------------------------------------------------------------------
*/

async function uploadToCloudinary(file, userId) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary environment variables are not configured."
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);

  const folder = "uniplate/shopowners";

  /*
   * Cloudinary signed upload signature
   */
  const signatureString =
    `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

  const signature = crypto
    .createHash("sha1")
    .update(signatureString)
    .digest("hex");

  /*
   * Convert File → Buffer
   */
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  /*
   * Cloudinary multipart upload
   */
  const formData = new FormData();

  formData.append(
    "file",
    new Blob([buffer], {
      type: file.type,
    }),
    file.name || "shop-owner-image"
  );

  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok || !data.secure_url) {
    console.error("CLOUDINARY ERROR:", data);

    throw new Error(
      data?.error?.message ||
        "Unable to upload image to Cloudinary."
    );
  }

  return data.secure_url;
}

/*
|--------------------------------------------------------------------------
| GET SHOP OWNER ACCOUNT
|--------------------------------------------------------------------------
*/

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
        message:
          error.message ||
          "Failed to load account.",
      },
      { status: 500 }
    );
  }
}

/*
|--------------------------------------------------------------------------
| UPDATE SHOP OWNER ACCOUNT
|--------------------------------------------------------------------------
*/

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
    const phone = formData.get("phone");
    const image = formData.get("image");

    console.log("ACCOUNT NAME:", name);
    console.log("ACCOUNT PHONE:", phone);
    console.log("ACCOUNT IMAGE:", image);

    /*
     * Validate shop name
     */
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
     * ========================================================
     * UPLOAD NEW PROFILE / SHOP IMAGE TO CLOUDINARY
     * ========================================================
     */

    if (
      image &&
      typeof image !== "string" &&
      image.size > 0
    ) {
      console.log("Uploading shop image to Cloudinary...");
      console.log("Image type:", image.type);
      console.log("Image size:", image.size);

      /*
       * Allowed image types
       */
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

      /*
       * Maximum 5 MB
       */
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
       * Upload directly to Cloudinary.
       *
       * IMPORTANT:
       * We DO NOT write anything to public/uploads.
       * This works on Vercel.
       */
      shopImage = await uploadToCloudinary(
        image,
        currentUser.user_id
      );

      console.log(
        "CLOUDINARY IMAGE URL:",
        shopImage
      );
    }

    /*
     * ========================================================
     * UPDATE MYSQL
     * ========================================================
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
          phone = ?,
          shop_image = ?
        WHERE user_id = ?
      `,
      [
        shopName,
        phone || currentUser.phone || null,
        shopImage,
        currentUser.user_id,
      ]
    );

    console.log(
      "MYSQL UPDATE RESULT:",
      updateResult
    );

    /*
     * ========================================================
     * VERIFY DATABASE
     * ========================================================
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

    /*
     * Return updated user
     */
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