import db from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { name, email, password, phone, role } = await request.json();

    if (!name || !email || !password || !role) {
      return Response.json(
        {
          success: false,
          message: "Name, email, password, and role are required",
        },
        { status: 400 }
      );
    }

    // "admin" is deliberately excluded — admin accounts are created
    // directly in the database, never through a public signup form.
    const allowedRoles = ["student", "shopowner", "delivery"];

    if (!allowedRoles.includes(role)) {
      return Response.json(
        {
          success: false,
          message: "Invalid role",
        },
        { status: 400 }
      );
    }

    const [existingUser] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return Response.json(
        {
          success: false,
          message: "Email already exists",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Students can order immediately. Shop owners and delivery riders
    // need an admin to approve them before they can log in.
    const approvalStatus = role === "student" ? "approved" : "pending";

    const [result] = await db.query(
      `INSERT INTO users (name, email, password, phone, role, approval_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone || null, role, approvalStatus]
    );

    return Response.json(
      {
        success: true,
        message:
          approvalStatus === "pending"
            ? `Registered. Your ${role} account is awaiting admin approval before you can log in.`
            : `${role} registered successfully`,
        user_id: result.insertId,
        role: role,
        approval_status: approvalStatus,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "Registration failed",
      },
      { status: 500 }
    );
  }
}