import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const account = await db.query.user.findFirst({ where: eq(user.id, session.user.id), columns: { role: true } });
  if (account?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { currentPassword, newPassword } = await request.json();
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Current and new passwords are required." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  try {
    await auth.api.changePassword({
      headers: request.headers,
      body: { currentPassword, newPassword, revokeOtherSessions: true },
    });
    return NextResponse.json({ ok: true, message: "Password updated. Other sessions were signed out." });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Password update failed." }, { status: 400 });
  }
}