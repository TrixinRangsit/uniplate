import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    // ==========================================
    // VALIDATE INPUT
    // ==========================================

    if (!email || !password) {
      return Response.json(
        {
          success: false,
          message: "Email and password are required",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // FIND USER
    // ==========================================

    const [users] = await db.query(
      `
      SELECT
        user_id,
        name,
        email,
        password,
        phone,
        role,
        approval_status,
        reject_reason
      FROM users
      WHERE LOWER(email) = ?
      LIMIT 1
      `,
      [email]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    const user = users[0];

    // ==========================================
    // CHECK PASSWORD
    // ==========================================

    if (!user.password) {
      return Response.json(
        {
          success: false,
          message: "This account does not have a valid password.",
        },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return Response.json(
        {
          success: false,
          message: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    // ==========================================
    // CHECK ACCOUNT APPROVAL
    // ==========================================

    // Students can log in normally.
    // Shop owners and delivery accounts need admin approval.

    if (
      (user.role === "shopowner" ||
        user.role === "delivery") &&
      user.approval_status === "pending"
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Your account is awaiting admin approval.",
        },
        { status: 403 }
      );
    }

    if (
      (user.role === "shopowner" ||
        user.role === "delivery") &&
      user.approval_status === "rejected"
    ) {
      return Response.json(
        {
          success: false,
          message: user.reject_reason
            ? `Registration rejected: ${user.reject_reason}`
            : "Your registration was rejected.",
        },
        { status: 403 }
      );
    }

    // ==========================================
    // CREATE SECURE SESSION
    // ==========================================

    await createSession({
      user_id: user.user_id,
      role: user.role,
    });

    // ==========================================
    // LOGIN SUCCESS
    // ==========================================

    return Response.json({
      success: true,
      message: "Login successful",

      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Login failed",
      },
      { status: 500 }
    );
  }
}