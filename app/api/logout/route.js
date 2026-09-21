import { destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await destroySession();

    return Response.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Logout failed",
      },
      { status: 500 }
    );
  }
}