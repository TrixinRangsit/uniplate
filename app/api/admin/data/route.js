import db from "@/lib/db";

export async function GET() {
  try {
    // Get all students
    const [students] = await db.query(`
      SELECT
        user_id AS student_id,
        name,
        email,
        phone,
        approval_status
      FROM users
      WHERE role = 'student'
      ORDER BY user_id DESC
    `);

    // Get Shop Owners and Delivery accounts
    const [approvals] = await db.query(`
      SELECT
        u.user_id,
        u.name,
        u.email,
        u.phone,
        u.role,
        u.approval_status,
        u.reject_reason,
        u.food_court_id,
        fc.name AS food_court_name
      FROM users u
      LEFT JOIN food_courts fc
        ON u.food_court_id = fc.food_court_id
      WHERE u.role IN ('shopowner', 'delivery')
      ORDER BY u.user_id DESC
    `);

    // Get all active food courts
    const [foodCourts] = await db.query(`
      SELECT
        food_court_id,
        name,
        location,
        status
      FROM food_courts
      WHERE status = 'active'
      ORDER BY food_court_id ASC
    `);

    // Get all orders
    const [orders] = await db.query(`
      SELECT
        o.order_id,
        u.name AS student_name,
        GROUP_CONCAT(
          CONCAT(mi.name, ' x', oi.quantity)
          SEPARATOR ', '
        ) AS menu,
        fc.name AS shop_name,
        o.total_amount AS total,
        o.order_status AS status
      FROM orders o

      INNER JOIN users u
        ON o.student_id = u.user_id

      INNER JOIN order_items oi
        ON o.order_id = oi.order_id

      INNER JOIN menu_items mi
        ON oi.menu_item_id = mi.menu_item_id

      INNER JOIN food_courts fc
        ON o.food_court_id = fc.food_court_id

      GROUP BY
        o.order_id,
        u.name,
        fc.name,
        o.total_amount,
        o.order_status

      ORDER BY o.order_id DESC
    `);

    return Response.json({
      success: true,
      students,
      approvals,
      foodCourts,
      orders,
    });
  } catch (error) {
    console.error("Admin data error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to load admin data",
      },
      { status: 500 }
    );
  }
}