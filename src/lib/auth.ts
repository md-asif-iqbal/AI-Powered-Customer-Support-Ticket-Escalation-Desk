import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { UserRole } from "./models/User";

const JWT_SECRET =
  process.env.JWT_SECRET || "nt_tech_practical_assessment_secure_jwt_token_secret_key_2026";
const JWT_EXPIRES_IN = "7d";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(
  plain: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts authenticated user from request cookies or Authorization header
 */
export async function getAuthUser(
  req?: NextRequest
): Promise<TokenPayload | null> {
  let token: string | undefined;

  // 1. Try Next.js Request cookies or Authorization header if request passed
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.cookies.get("auth_token")?.value;
    }
  }

  // 2. Fall back to Server Component cookies()
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("auth_token")?.value;
    } catch {
      // In certain non-request contexts cookies() may throw
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export function buildAuthCookie(token: string) {
  return `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${
    7 * 24 * 60 * 60
  }`;
}

export function clearAuthCookie() {
  return `auth_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
