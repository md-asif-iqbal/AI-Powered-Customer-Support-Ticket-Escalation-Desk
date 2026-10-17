import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { comparePassword, signToken, buildAuthCookie } from "@/lib/auth";
import { LoginSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid credentials format", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json({
      message: "Login successful",
      user: tokenPayload,
      token,
    });

    response.headers.set("Set-Cookie", buildAuthCookie(token));
    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please verify database connection." },
      { status: 500 }
    );
  }
}
