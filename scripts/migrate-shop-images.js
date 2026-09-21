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

async function uploadImage(filePath) {
  return new Promise((resolve, reject) => {
    cloudinaryV2.uploader.upload(
      filePath,
      {
        folder: "uniplate/shops",
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
  });
}

async function main() {
  console.log("====================================");
  console.log("UniPlate Shop Image Migration");
  console.log("====================================");

  const [shops] = await db.query(`
    SELECT
      user_id,
      name,
      shop_image
    FROM users
    WHERE role = 'shopowner'
      AND shop_image IS NOT NULL
      AND shop_image LIKE '/uploads/shop-%'
    ORDER BY user_id ASC
  `);

  console.log(
    `Found ${shops.length} shop images to migrate.`
  );

  let successCount = 0;
  let failedCount = 0;

  for (const shop of shops) {
    console.log("");
    console.log("------------------------------------");
    console.log(`Shop #${shop.user_id}: ${shop.name}`);
    console.log("Database image:", shop.shop_image);

    try {
      const relativePath = shop.shop_image.replace(
        /^\/uploads\//,
        ""
      );

      const filePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        relativePath
      );

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

      console.log("Uploading to Cloudinary...");

      const result = await uploadImage(filePath);

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

      await db.query(
        `
        UPDATE users
        SET shop_image = ?
        WHERE user_id = ?
        `,
        [
          cloudinaryUrl,
          shop.user_id,
        ]
      );

      console.log("✅ Database updated.");

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
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total: ${shops.length}`);
  console.log("====================================");

  await db.end();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);

  try {
    await db.end();
  } catch {}

  process.exit(1);
});