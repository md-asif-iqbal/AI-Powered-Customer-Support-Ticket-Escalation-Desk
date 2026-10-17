import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { hashPassword, signToken, buildAuthCookie } from "@/lib/auth";
import { RegisterSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password, role } = parseResult.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "CUSTOMER",
    });

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = signToken(tokenPayload);

    const response = NextResponse.json(
      {
        message: "Account registered successfully",
        user: tokenPayload,
        token,
      },
      { status: 201 }
    );

    response.headers.set("Set-Cookie", buildAuthCookie(token));
    return response;
  } catch (error: unknown) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Registration failed. Please check database connection." },
      { status: 500 }
    );
  }
}
