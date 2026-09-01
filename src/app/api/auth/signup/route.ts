import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, buildSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password || password.length < 8) {
    return NextResponse.json({ error: "Email and an 8+ character password are required." }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }
  const user = await db.user.create({ data: { email, name, passwordHash: hashPassword(password) } });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  const cookie = buildSessionCookie(user.id);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
