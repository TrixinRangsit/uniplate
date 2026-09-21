import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "Please log in first",
        },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student account required",
        },
        { status: 403 }
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
        created_at
      FROM users
      WHERE user_id = ?
        AND role = 'student'
      LIMIT 1
      `,
      [session.user_id]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Student account not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      user: users[0],
    });
  } catch (error) {
    console.error("STUDENT ACCOUNT GET ERROR:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to load student account",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();

    if (!session || !session.user_id) {
      return Response.json(
        {
          success: false,
          message: "Please log in first",
        },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return Response.json(
        {
          success: false,
          message: "Student account required",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = body.name?.trim();
    const phone = body.phone?.trim() || null;
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;

    if (!name) {
      return Response.json(
        {
          success: false,
          message: "Name is required",
        },
        { status: 400 }
      );
    }

    // Get current account
    const [users] = await db.query(
      `
      SELECT
        user_id,
        password
      FROM users
      WHERE user_id = ?
        AND role = 'student'
      LIMIT 1
      `,
      [session.user_id]
    );

    if (users.length === 0) {
      return Response.json(
        {
          success: false,
          message: "Student account not found",
        },
        { status: 404 }
      );
    }

    const user = users[0];

    // Change password if requested
    if (newPassword) {
      if (!currentPassword) {
        return Response.json(
          {
            success: false,
            message:
              "Current password is required",
          },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return Response.json(
          {
            success: false,
            message:
              "New password must be at least 6 characters",
          },
          { status: 400 }
        );
      }

      const passwordMatch =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (!passwordMatch) {
        return Response.json(
          {
            success: false,
            message:
              "Current password is incorrect",
          },
          { status: 400 }
        );
      }

      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          10
        );

      await db.query(
        `
        UPDATE users
        SET
          name = ?,
          phone = ?,
          password = ?
        WHERE user_id = ?
          AND role = 'student'
        `,
        [
          name,
          phone,
          hashedPassword,
          session.user_id,
        ]
      );
    } else {
      // Update profile only
      await db.query(
        `
        UPDATE users
        SET
          name = ?,
          phone = ?
        WHERE user_id = ?
          AND role = 'student'
        `,
        [
          name,
          phone,
          session.user_id,
        ]
      );
    }

    return Response.json({
      success: true,
      message:
        "Account updated successfully",
    });
  } catch (error) {
    console.error("STUDENT ACCOUNT PUT ERROR:", error);

    return Response.json(
      {
        success: false,
        message:
          error.message ||
          "Failed to update account",
      },
      { status: 500 }
    );
  }
}