import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contributions, pools } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { isAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: pools.id,
      name: pools.name,
      purpose: pools.purpose,
      beneficiary: pools.beneficiary,
      paymentDestinations: pools.paymentDestinations,
      paymentInstructions: pools.paymentInstructions,
      capAmount: pools.capAmount,
      currency: pools.currency,
      status: pools.status,
      createdAt: pools.createdAt,
      totalAllocated: sql<string>`coalesce(sum(${contributions.allocatedAmount}), 0)`,
    })
    .from(pools)
    .leftJoin(contributions, eq(contributions.poolId, pools.id))
    .groupBy(pools.id)
    .orderBy(desc(pools.createdAt));

  return NextResponse.json({ ok: true, pools: rows });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, purpose, beneficiary, capAmount, currency, paymentDestinations, paymentInstructions } = body;
    if (!name || !purpose || !beneficiary || !capAmount || !paymentInstructions || !Array.isArray(paymentDestinations) || paymentDestinations.length === 0) {
      return NextResponse.json({ error: "Name, purpose, beneficiary, cap, at least one payment destination, and instructions are required." }, { status: 400 });
    }

    const destinations = paymentDestinations
      .filter((destination: unknown): destination is { label: string; value: string } => typeof destination === "object" && destination !== null && typeof (destination as { label?: unknown }).label === "string" && typeof (destination as { value?: unknown }).value === "string")
      .map((destination) => ({ label: destination.label.trim(), value: destination.value.trim() }))
      .filter((destination) => destination.label && destination.value);
    if (!destinations.length) return NextResponse.json({ error: "Add at least one complete payment destination." }, { status: 400 });

    const cap = Number(capAmount);
    if (!Number.isFinite(cap) || cap <= 0) {
      return NextResponse.json({ error: "Cap amount must be greater than zero." }, { status: 400 });
    }

    const [pool] = await db.insert(pools).values({
      id: crypto.randomUUID(),
      name: String(name).trim(),
      purpose: String(purpose).trim(),
      beneficiary: String(beneficiary).trim(),
      capAmount: cap.toFixed(2),
      currency: currency || "ETB",
      paymentDestinations: destinations,
      paymentInstructions: String(paymentInstructions).trim(),
      status: "open",
    }).returning();

    return NextResponse.json({ ok: true, pool }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create pool";
    const migrationHint = message.includes("payment_destinations") || message.includes("column")
      ? " Run the latest database migration with: npx drizzle-kit migrate"
      : "";
    return NextResponse.json({ error: `${message}.${migrationHint}` }, { status: 500 });
  }
}