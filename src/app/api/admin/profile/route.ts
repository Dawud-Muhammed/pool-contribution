import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const account = await db.query.user.findFirst({ where: eq(user.id, session.user.id), columns: { id: true, name: true, email: true, role: true } });
  if (!account || account.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json({ ok: true, profile: account });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const account = await db.query.user.findFirst({ where: eq(user.id, session.user.id), columns: { role: true } });
  if (account?.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const [updated] = await db.update(user).set({ name: name.trim(), updatedAt: new Date() }).where(eq(user.id, session.user.id)).returning({ id: user.id, name: user.name, email: user.email, role: user.role });
  return NextResponse.json({ ok: true, profile: updated });
}