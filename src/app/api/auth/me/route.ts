import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    await connectToDatabase();
    const userDoc = await User.findById(authUser.userId).select("-passwordHash");
    if (!userDoc) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        userId: userDoc._id.toString(),
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
      },
    });
  } catch (error: unknown) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
