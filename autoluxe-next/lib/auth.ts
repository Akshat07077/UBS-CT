import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import crypto from "crypto";
import type { User } from "./db/schema";

export interface SessionData {
  userId?: number;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex-password-at-least-32-chars-long!!",
  cookieName: "autoluxe_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function hashPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + (process.env.SESSION_SECRET || "secret"))
    .digest("hex");
}

export function formatUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}
