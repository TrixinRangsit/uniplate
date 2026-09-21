import mysql from "mysql2/promise";
import cloudinary from "cloudinary";
import fs from "fs/promises";
import path from "path";

const { v2: cloudinaryV2 } = cloudinary;

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
});

async function uploadImage(filePath, originalName) {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload(
      filePath,
      {
        folder: "uniplate/menu",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );
  });
}

async function main() {
  console.log("====================================");
  console.log("UniPlate Menu Image Migration");
  console.log("====================================");

  console.log(
    "Cloudinary:",
    process.env.CLOUDINARY_CLOUD_NAME
  );

  const [menuItems] = await db.query(`
    SELECT
      menu_item_id,
      name,
      image
    FROM menu_items
    WHERE image IS NOT NULL
      AND image LIKE '/uploads/menu-%'
    ORDER BY menu_item_id ASC
  `);

  console.log(
    `Found ${menuItems.length} menu images to migrate.`
  );

  if (menuItems.length === 0) {
    console.log("No old menu images found.");
    await db.end();
    return;
  }

  let successCount = 0;
  let failedCount = 0;

  for (const item of menuItems) {
    console.log("");
    console.log("------------------------------------");
    console.log(
      `Menu #${item.menu_item_id}: ${item.name}`
    );
    console.log("Database image:", item.image);

    try {
      /*
        Convert:

        /uploads/menu-9-123456.jpg

        into:

        D:\csc480project\public\uploads\menu-9-123456.jpg
      */

      const relativePath = item.image.replace(
        /^\/uploads\//,
        ""
      );

      const filePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        relativePath
      );

      /*
        Check that the old local file actually exists.
      */

      try {
        await fs.access(filePath);
      } catch {
        console.log(
          "❌ Local file not found:",
          filePath
        );

        failedCount++;
        continue;
      }

      /*
        Upload to Cloudinary.
      */

      console.log("Uploading to Cloudinary...");

      const result = await uploadImage(
        filePath,
        path.basename(filePath)
      );

      if (!result?.secure_url) {
        console.log(
          "❌ Cloudinary did not return an image URL."
        );

        failedCount++;
        continue;
      }

      const cloudinaryUrl = result.secure_url;

      console.log(
        "✅ Cloudinary URL:",
        cloudinaryUrl
      );

      /*
        Update MySQL only after Cloudinary
        upload succeeded.
      */

      await db.query(
        `
        UPDATE menu_items
        SET image = ?
        WHERE menu_item_id = ?
        `,
        [
          cloudinaryUrl,
          item.menu_item_id,
        ]
      );

      console.log(
        "✅ Database updated."
      );

      successCount++;
    } catch (error) {
      console.error(
        "❌ Migration failed:",
        error?.message || error
      );

      failedCount++;
    }
  }

  console.log("");
  console.log("====================================");
  console.log("Migration Finished");
  console.log("====================================");
  console.log(
    `Successful: ${successCount}`
  );
  console.log(
    `Failed: ${failedCount}`
  );
  console.log(
    `Total: ${menuItems.length}`
  );
  console.log("====================================");

  await db.end();
}

main().catch(async (error) => {
  console.error("");
  console.error(
    "FATAL ERROR:",
    error
  );

  try {
    await db.end();
  } catch {}

  process.exit(1);
});