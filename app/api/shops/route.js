import db from "@/lib/db";

export async function GET() {
  try {
    const [shops] = await db.query(`
      SELECT
        user_id,
        name,
        email,
        phone,
        role,
        approval_status,
        shop_image
      FROM users
      WHERE role = 'shopowner'
        AND approval_status = 'approved'
      ORDER BY name ASC
    `);

    return Response.json({
      success: true,
      shops,
    });

  } catch (error) {
    console.error("SHOPS API ERROR:", error);

    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}