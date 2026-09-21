import cloudinary from "@/lib/cloudinary";

export async function GET() {
  try {
    const config = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      has_api_secret: Boolean(process.env.CLOUDINARY_API_SECRET),
    };

    console.log("CLOUDINARY CONFIG CHECK:", {
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      has_api_secret: config.has_api_secret,
    });

    const result = await cloudinary.api.ping();

    return Response.json({
      success: true,
      message: "Cloudinary connection successful.",
      status: result.status,
      config: {
        cloud_name: config.cloud_name,
        api_key: config.api_key,
        has_api_secret: config.has_api_secret,
      },
    });
  } catch (error) {
    console.error("CLOUDINARY TEST ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Cloudinary connection failed.",
        error: {
          name: error?.name || "Unknown",
          message: error?.message || "No error message",
          http_code: error?.http_code || null,
          error: error?.error || null,
        },
        config: {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "MISSING",
          api_key: process.env.CLOUDINARY_API_KEY || "MISSING",
          has_api_secret: Boolean(
            process.env.CLOUDINARY_API_SECRET
          ),
        },
      },
      { status: 500 }
    );
  }
}