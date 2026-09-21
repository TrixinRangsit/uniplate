import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user_id) {
      return Response.json({
        success: true,
        loggedIn: false,
      });
    }

    return Response.json({
      success: true,
      loggedIn: true,
      user: {
        user_id: session.user_id,
        role: session.role,
      },
    });
  } catch (error) {
    console.error("SESSION CHECK ERROR:", error);

    return Response.json(
      {
        success: false,
        loggedIn: false,
        message: "Unable to check login status",
      },
      { status: 500 }
    );
  }
}